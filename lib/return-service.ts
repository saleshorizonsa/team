import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { periodOf, reversedTotalForDeal } from "@/lib/commission-service";

export async function generateReturnNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `R-${year}-`;
  const result = await db.$queryRaw<{ maxNum: bigint | null }[]>`
    SELECT MAX(CAST(SUBSTRING_INDEX(returnNumber, '-', -1) AS UNSIGNED)) AS maxNum
    FROM \`Return\`
    WHERE returnNumber LIKE ${prefix + "%"}
  `;
  const maxNum = result[0]?.maxNum ? Number(result[0].maxNum) : 0;
  return `${prefix}${String(maxNum + 1).padStart(4, "0")}`;
}

export interface RecordReturnInput {
  dealId: string;
  returnDate: Date;
  returnedSalesAmount: number;
  costRecovered: number;
  returnCosts: number;
  reason?: string | null;
}

/**
 * Record a return against an APPROVED deal and apply the cross-month-safe clawback:
 *  • PENDING original earnings → recomputed in place on NET profit (no extra line)
 *  • PAID original earnings    → NEGATIVE CLAWBACK rows in the CURRENT open period
 * Never mutates the Deal; never reopens a closed/paid period.
 */
export async function recordReturn(input: RecordReturnInput, actorId: string) {
  const deal = await db.deal.findFirst({ where: { id: input.dealId, deletedAt: null } });
  if (!deal) throw new Error("Deal not found");
  if (deal.status !== "APPROVED") throw new Error("Returns can only be recorded against APPROVED deals");

  const reversedProfit =
    input.returnedSalesAmount - input.costRecovered + input.returnCosts;

  const returnNumber = await generateReturnNumber();

  const ret = await db.return.create({
    data: {
      returnNumber,
      dealId: deal.id,
      returnDate: input.returnDate,
      returnedSalesAmount: new Prisma.Decimal(input.returnedSalesAmount.toFixed(2)),
      costRecovered: new Prisma.Decimal(input.costRecovered.toFixed(2)),
      returnCosts: new Prisma.Decimal(input.returnCosts.toFixed(2)),
      reversedProfit: new Prisma.Decimal(reversedProfit.toFixed(2)),
      reason: input.reason || null,
      createdById: actorId,
    },
  });

  // Original earning lines for this deal (one per participant)
  const earnings = await db.commission.findMany({
    where: { dealId: deal.id, type: "EARNING" },
  });

  // NET profit after ALL returns on this deal (the new one is already persisted)
  const totalReversed = await reversedTotalForDeal(deal.id);
  const netProfit = Number(deal.profit) - totalReversed;
  const currentPeriod = periodOf(new Date());

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const e of earnings) {
    const pct = Number(e.percent);
    if (e.payoutStatus === "PENDING") {
      // recompute in place on net profit (cumulative across all returns)
      ops.push(
        db.commission.update({
          where: { id: e.id },
          data: { amount: new Prisma.Decimal(((netProfit * pct) / 100).toFixed(2)) },
        })
      );
    } else {
      // PAID → immutable; create a negative clawback for THIS return in the open period
      const clawback = -((reversedProfit * pct) / 100);
      ops.push(
        db.commission.create({
          data: {
            dealId: deal.id,
            returnId: ret.id,
            userId: e.userId,
            role: e.role,
            type: "CLAWBACK",
            percent: e.percent,
            amount: new Prisma.Decimal(clawback.toFixed(2)),
            period: currentPeriod,
            payoutStatus: "PENDING",
          },
        })
      );
    }
  }
  if (ops.length) await db.$transaction(ops);

  return ret;
}
