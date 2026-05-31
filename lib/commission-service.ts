import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  computeCommissions,
  type CommissionRules,
  type CommissionParticipant,
} from "@/lib/commission";

export const DEFAULT_RULES: CommissionRules = {
  scheme: "POOLED",
  ownerPercent: 25,
  salesPoolPercent: 75,
  shares: {},
};

export async function getCommissionRules(): Promise<CommissionRules> {
  const row = await db.setting.findUnique({ where: { key: "commission_rules" } });
  if (!row) return DEFAULT_RULES;
  return row.value as unknown as CommissionRules;
}

export function periodOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function activeParticipants(): Promise<CommissionParticipant[]> {
  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, role: true },
  });
  return users.map((u) => ({ userId: u.id, fullName: u.fullName, role: u.role }));
}

/**
 * (Re)generate PENDING commission rows for a single APPROVED deal.
 * Skips entirely if the deal already has any PAID commission (immutable payout).
 */
export async function generateCommissionsForDeal(
  dealId: string,
  rules?: CommissionRules
): Promise<void> {
  const deal = await db.deal.findUnique({ where: { id: dealId } });
  if (!deal || deal.status !== "APPROVED" || deal.deletedAt) return;

  // Don't touch a deal whose EARNING commissions have already been paid out.
  const paidCount = await db.commission.count({
    where: { dealId, type: "EARNING", payoutStatus: "PAID" },
  });
  if (paidCount > 0) return;

  const r = rules ?? (await getCommissionRules());
  const participants = await activeParticipants();
  // EARNING lines are always computed on NET profit (gross − returns).
  const netProfit = Number(deal.profit) - (await reversedTotalForDeal(dealId));
  const lines = computeCommissions({
    profit: netProfit,
    rules: r,
    participants,
    creditedUserIds: creditedIdsOf(deal.creditedUserIds, deal.salespersonId),
  });
  const period = periodOf(new Date(deal.dealDate));

  await db.$transaction([
    // Only regenerate EARNING lines; CLAWBACK rows are immutable history.
    db.commission.deleteMany({ where: { dealId, type: "EARNING", payoutStatus: "PENDING" } }),
    ...lines.map((l) =>
      db.commission.create({
        data: {
          dealId,
          userId: l.userId,
          role: l.role,
          type: "EARNING",
          percent: new Prisma.Decimal(l.percentOfProfit.toFixed(2)),
          amount: new Prisma.Decimal(l.amount.toFixed(2)),
          period,
          payoutStatus: "PENDING",
        },
      })
    ),
  ]);
}

/** Credited salespeople for a deal — JSON array if set, else [salespersonId]. */
export function creditedIdsOf(creditedUserIds: unknown, salespersonId: string): string[] {
  if (Array.isArray(creditedUserIds) && creditedUserIds.length > 0) {
    return creditedUserIds.filter((x): x is string => typeof x === "string");
  }
  return [salespersonId];
}

/** Sum of reversedProfit across all returns recorded against a deal. */
export async function reversedTotalForDeal(dealId: string): Promise<number> {
  const agg = await db.return.aggregate({
    where: { dealId },
    _sum: { reversedProfit: true },
  });
  return Number(agg._sum.reversedProfit ?? 0);
}

/**
 * Recompute PENDING commissions across every APPROVED deal that has no PAID rows.
 * Returns the number of deals affected.
 */
export async function recomputeAllPendingCommissions(rules: CommissionRules): Promise<number> {
  const deals = await db.deal.findMany({
    where: { status: "APPROVED", deletedAt: null },
    select: { id: true },
  });
  let affected = 0;
  for (const d of deals) {
    const paid = await db.commission.count({
      where: { dealId: d.id, payoutStatus: "PAID" },
    });
    if (paid === 0) {
      await generateCommissionsForDeal(d.id, rules);
      affected++;
    }
  }
  return affected;
}

export interface RecomputePreviewRow {
  userId: string;
  fullName: string;
  before: number;
  after: number;
}

/**
 * Simulate a rules change without writing: per-user PENDING totals before vs after.
 */
export async function previewRecompute(
  newRules: CommissionRules
): Promise<{ rows: RecomputePreviewRow[]; affectedDeals: number }> {
  const users = await db.user.findMany({
    select: { id: true, fullName: true, role: true, isActive: true },
  });
  const nameOf = new Map(users.map((u) => [u.id, u.fullName]));
  const participants: CommissionParticipant[] = users
    .filter((u) => u.isActive)
    .map((u) => ({ userId: u.id, fullName: u.fullName, role: u.role }));

  // before — current pending EARNING totals (clawbacks are unaffected by rules)
  const pending = await db.commission.findMany({
    where: { payoutStatus: "PENDING", type: "EARNING" },
    select: { userId: true, amount: true },
  });
  const before = new Map<string, number>();
  for (const c of pending) {
    before.set(c.userId, (before.get(c.userId) ?? 0) + Number(c.amount));
  }

  // after — simulate EARNING on NET profit for approved deals without paid earnings
  const deals = await db.deal.findMany({
    where: { status: "APPROVED", deletedAt: null },
    select: { id: true, profit: true, dealDate: true, salespersonId: true, creditedUserIds: true },
  });
  const after = new Map<string, number>();
  let affectedDeals = 0;
  for (const d of deals) {
    const paid = await db.commission.count({
      where: { dealId: d.id, type: "EARNING", payoutStatus: "PAID" },
    });
    if (paid > 0) continue;
    affectedDeals++;
    const netProfit = Number(d.profit) - (await reversedTotalForDeal(d.id));
    const lines = computeCommissions({
      profit: netProfit,
      rules: newRules,
      participants,
      creditedUserIds: creditedIdsOf(d.creditedUserIds, d.salespersonId),
    });
    for (const l of lines) {
      after.set(l.userId, (after.get(l.userId) ?? 0) + l.amount);
    }
  }

  const ids = new Set([...before.keys(), ...after.keys()]);
  const rows: RecomputePreviewRow[] = [...ids].map((id) => ({
    userId: id,
    fullName: nameOf.get(id) ?? "Unknown",
    before: before.get(id) ?? 0,
    after: after.get(id) ?? 0,
  }));
  rows.sort((a, b) => b.after - a.after);
  return { rows, affectedDeals };
}
