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

  const paidCount = await db.commission.count({
    where: { dealId, payoutStatus: "PAID" },
  });
  if (paidCount > 0) return;

  const r = rules ?? (await getCommissionRules());
  const participants = await activeParticipants();
  const lines = computeCommissions({
    profit: Number(deal.profit),
    rules: r,
    participants,
    salespersonId: deal.salespersonId,
  });
  const period = periodOf(new Date(deal.dealDate));

  await db.$transaction([
    db.commission.deleteMany({ where: { dealId, payoutStatus: "PENDING" } }),
    ...lines.map((l) =>
      db.commission.create({
        data: {
          dealId,
          userId: l.userId,
          role: l.role,
          percent: new Prisma.Decimal(l.percentOfProfit.toFixed(2)),
          amount: new Prisma.Decimal(l.amount.toFixed(2)),
          period,
          payoutStatus: "PENDING",
        },
      })
    ),
  ]);
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

  // before — current pending totals
  const pending = await db.commission.findMany({
    where: { payoutStatus: "PENDING" },
    select: { userId: true, amount: true },
  });
  const before = new Map<string, number>();
  for (const c of pending) {
    before.set(c.userId, (before.get(c.userId) ?? 0) + Number(c.amount));
  }

  // after — simulate for approved deals without paid rows
  const deals = await db.deal.findMany({
    where: { status: "APPROVED", deletedAt: null },
    select: { id: true, profit: true, dealDate: true, salespersonId: true },
  });
  const after = new Map<string, number>();
  let affectedDeals = 0;
  for (const d of deals) {
    const paid = await db.commission.count({
      where: { dealId: d.id, payoutStatus: "PAID" },
    });
    if (paid > 0) continue;
    affectedDeals++;
    const lines = computeCommissions({
      profit: Number(d.profit),
      rules: newRules,
      participants,
      salespersonId: d.salespersonId,
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
