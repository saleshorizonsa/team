// Pure commission-split calculation — shared by the live form preview (Phase 3)
// and the actual commission-row generation on approval (Phase 4).

export interface CommissionRules {
  scheme: "POOLED" | "PER_DEAL";
  ownerPercent: number;
  salesPoolPercent: number;
  shares: Record<string, number>; // userId -> share % of the sales pool
}

export interface CommissionParticipant {
  userId: string;
  fullName: string;
  role: "ADMIN" | "USER";
}

export interface CommissionLine {
  userId: string;
  fullName: string;
  role: "ADMIN" | "USER";
  /** effective % of the deal's profit this person receives */
  percentOfProfit: number;
  amount: number;
}

interface ComputeArgs {
  profit: number;
  rules: CommissionRules;
  participants: CommissionParticipant[]; // active users (admins + users)
  creditedUserIds: string[];             // salespeople sharing the pool (equal split)
}

/**
 * Commission breakdown for a deal's profit:
 *  - the owner (ADMIN) pool gets ownerPercent, split evenly among admins
 *  - the sales pool (salesPoolPercent) is split EQUALLY among the deal's
 *    credited salespeople (creditedUserIds)
 * Negative/zero profit yields zero-amount lines (still shown for transparency).
 */
export function computeCommissions({ profit, rules, participants, creditedUserIds }: ComputeArgs): CommissionLine[] {
  const lines: CommissionLine[] = [];
  const admins = participants.filter((p) => p.role === "ADMIN");
  const safeProfit = isFinite(profit) ? profit : 0;

  // Owner (ADMIN) portion — owner pool split evenly among admins (usually one).
  const ownerPctEach = admins.length ? rules.ownerPercent / admins.length : 0;
  for (const a of admins) {
    lines.push({
      userId: a.userId,
      fullName: a.fullName,
      role: "ADMIN",
      percentOfProfit: ownerPctEach,
      amount: (safeProfit * ownerPctEach) / 100,
    });
  }

  // Sales pool — split equally among the deal's credited salespeople.
  const reps = creditedUserIds
    .map((id) => participants.find((p) => p.userId === id))
    .filter((p): p is CommissionParticipant => !!p);
  const poolPctEach = reps.length ? rules.salesPoolPercent / reps.length : 0;
  for (const r of reps) {
    lines.push({
      userId: r.userId,
      fullName: r.fullName,
      role: r.role,
      percentOfProfit: poolPctEach,
      amount: (safeProfit * poolPctEach) / 100,
    });
  }

  return lines;
}
