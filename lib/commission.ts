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
  salespersonId: string;                 // credited salesperson (for PER_DEAL)
}

/**
 * Returns the commission breakdown for a deal's profit.
 * Negative or zero profit yields zero-amount lines (still shown for transparency).
 */
export function computeCommissions({ profit, rules, participants, salespersonId }: ComputeArgs): CommissionLine[] {
  const lines: CommissionLine[] = [];
  const admins = participants.filter((p) => p.role === "ADMIN");
  const users = participants.filter((p) => p.role === "USER");
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

  if (rules.scheme === "PER_DEAL") {
    // The credited salesperson takes the whole sales-pool percentage.
    const sp = users.find((u) => u.userId === salespersonId);
    if (sp) {
      lines.push({
        userId: sp.userId,
        fullName: sp.fullName,
        role: "USER",
        percentOfProfit: rules.salesPoolPercent,
        amount: (safeProfit * rules.salesPoolPercent) / 100,
      });
    }
  } else {
    // POOLED: sales pool split among USERs by their share %.
    // If no shares configured, split evenly.
    const totalShares = users.reduce((s, u) => s + (rules.shares[u.userId] ?? 0), 0);
    for (const u of users) {
      const sharePct =
        totalShares > 0
          ? (rules.shares[u.userId] ?? 0) / totalShares
          : users.length
          ? 1 / users.length
          : 0;
      const pctOfProfit = rules.salesPoolPercent * sharePct;
      lines.push({
        userId: u.userId,
        fullName: u.fullName,
        role: "USER",
        percentOfProfit: pctOfProfit,
        amount: (safeProfit * pctOfProfit) / 100,
      });
    }
  }

  return lines;
}
