"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatSAR } from "@/lib/utils";
import { computeCommissions, type CommissionRules, type CommissionParticipant } from "@/lib/commission";

interface Props {
  salesTotal: string;
  purchaseTotal: string;
  transportation: string;
  vatRatePercent: string;
  salespersonId: string;
  rules: CommissionRules;
  participants: CommissionParticipant[];
}

function num(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

export function ProfitPreview({
  salesTotal, purchaseTotal, transportation, vatRatePercent, salespersonId, rules, participants,
}: Props) {
  const st = num(salesTotal);
  const pt = num(purchaseTotal);
  const tr = num(transportation);
  const vr = num(vatRatePercent);

  const profit = st - pt - tr;
  const vatAmount = (st * vr) / 100;

  const lines = useMemo(
    () => computeCommissions({ profit, rules, participants, salespersonId }),
    [profit, rules, participants, salespersonId]
  );

  const profitPositive = profit >= 0;

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
      {/* Profit calc */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Sales Total</span>
          <span className="font-mono">{formatSAR(st)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">− Purchase Total</span>
          <span className="font-mono text-muted-foreground">{formatSAR(pt)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">− Transportation</span>
          <span className="font-mono text-muted-foreground">{formatSAR(tr)}</span>
        </div>
        <div className="flex items-center justify-between border-t pt-1.5">
          <span className={cn("text-sm font-semibold flex items-center gap-1", profitPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
            {profitPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            Profit
          </span>
          <span className={cn("font-mono font-semibold", profitPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
            {formatSAR(profit)}
          </span>
        </div>
      </div>

      {/* VAT — informational only */}
      <div className="flex items-center justify-between rounded-md bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-xs">
        <span className="text-blue-700 dark:text-blue-400">VAT ({vr}%) — excluded from profit</span>
        <span className="font-mono text-blue-700 dark:text-blue-400">{formatSAR(vatAmount)}</span>
      </div>

      {/* Commission split preview */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Commission Split Preview ({rules.scheme === "POOLED" ? "Pooled" : "Per-Deal"})
        </p>
        {lines.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No active participants configured.</p>
        ) : (
          lines.map((l) => (
            <div key={l.userId} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <span className={cn("inline-block h-1.5 w-1.5 rounded-full", l.role === "ADMIN" ? "bg-purple-500" : "bg-primary")} />
                {l.fullName}
                <span className="text-[10px] text-muted-foreground">
                  ({l.percentOfProfit.toFixed(1)}%)
                </span>
              </span>
              <span className="font-mono">{formatSAR(l.amount)}</span>
            </div>
          ))
        )}
        <p className="text-[10px] text-muted-foreground pt-1">
          Commission rows are generated only when the deal is approved (Phase 4).
        </p>
      </div>
    </div>
  );
}
