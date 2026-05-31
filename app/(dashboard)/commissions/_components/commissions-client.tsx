"use client";

import { useState, useMemo } from "react";
import { DollarSign, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { cn, formatSAR, formatDate } from "@/lib/utils";

interface CommissionRow {
  id: string;
  period: string;
  percent: number;
  amount: number;
  payoutStatus: "PENDING" | "PAID";
  paidAt: Date | string | null;
  user: { id: string; fullName: string; role: "ADMIN" | "USER" };
  deal: { id: string; dealNumber: string; profit: number; customer: { name: string } };
}

interface Props {
  initialCommissions: CommissionRow[];
  isAdmin: boolean;
  sessionUserId: string;
}

function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function CommissionsClient({ initialCommissions, isAdmin }: Props) {
  const [commissions, setCommissions] = useState(initialCommissions);
  const [periodFilter, setPeriodFilter] = useState("");
  const [payingIds, setPayingIds] = useState<string[] | null>(null);

  const periods = useMemo(
    () => [...new Set(commissions.map((c) => c.period))].sort().reverse(),
    [commissions]
  );

  const visible = useMemo(
    () => (periodFilter ? commissions.filter((c) => c.period === periodFilter) : commissions),
    [commissions, periodFilter]
  );

  // group by period → user
  const grouped = useMemo(() => {
    const byPeriod = new Map<string, CommissionRow[]>();
    for (const c of visible) {
      if (!byPeriod.has(c.period)) byPeriod.set(c.period, []);
      byPeriod.get(c.period)!.push(c);
    }
    return [...byPeriod.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [visible]);

  async function payIds(ids: string[]) {
    if (ids.length === 0) return;
    setPayingIds(ids);
    try {
      const res = await fetch("/api/commissions/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Payout failed");
      const { paidAt } = await res.json();
      setCommissions((prev) =>
        prev.map((c) => (ids.includes(c.id) ? { ...c, payoutStatus: "PAID" as const, paidAt } : c))
      );
      toast.success(`Marked ${ids.length} commission(s) as paid`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payout failed");
    } finally {
      setPayingIds(null);
    }
  }

  if (commissions.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader title="Commissions" description="Per-period commission statements" />
        <EmptyState icon={DollarSign} title="No commissions yet"
          description="Commissions are generated automatically when a deal is approved." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Commissions" description="Per-period commission statements — visible to everyone">
        <Select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="w-44 h-9">
          <option value="">All Periods</option>
          {periods.map((p) => <option key={p} value={p}>{periodLabel(p)}</option>)}
        </Select>
      </PageHeader>

      {grouped.map(([period, rows]) => {
        const total = rows.reduce((s, r) => s + r.amount, 0);
        const pending = rows.filter((r) => r.payoutStatus === "PENDING");
        const pendingTotal = pending.reduce((s, r) => s + r.amount, 0);

        // per-user subtotals
        const byUser = new Map<string, { name: string; role: string; pending: number; paid: number; ids: string[] }>();
        for (const r of rows) {
          if (!byUser.has(r.user.id)) byUser.set(r.user.id, { name: r.user.fullName, role: r.user.role, pending: 0, paid: 0, ids: [] });
          const e = byUser.get(r.user.id)!;
          if (r.payoutStatus === "PAID") e.paid += r.amount;
          else { e.pending += r.amount; e.ids.push(r.id); }
        }

        return (
          <div key={period} className="rounded-xl border bg-card shadow-sm overflow-hidden">
            {/* Period header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
              <div>
                <h3 className="font-semibold">{periodLabel(period)}</h3>
                <p className="text-xs text-muted-foreground">
                  {rows.length} commission(s) · Total {formatSAR(total)} · Pending {formatSAR(pendingTotal)}
                </p>
              </div>
              {isAdmin && pending.length > 0 && (
                <Button size="sm" variant="outline"
                  onClick={() => payIds(pending.map((r) => r.id))}
                  disabled={!!payingIds}>
                  {payingIds ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Mark Period Paid
                </Button>
              )}
            </div>

            {/* Per-user summary */}
            <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
              {[...byUser.entries()].map(([uid, u]) => (
                <div key={uid} className="bg-card p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-1.5">
                      <span className={cn("inline-block h-1.5 w-1.5 rounded-full", u.role === "ADMIN" ? "bg-purple-500" : "bg-primary")} />
                      {u.name}
                    </span>
                    {isAdmin && u.pending > 0 && (
                      <button onClick={() => payIds(u.ids)} disabled={!!payingIds}
                        className="text-[11px] text-primary hover:underline disabled:opacity-50">
                        Pay {formatSAR(u.pending)}
                      </button>
                    )}
                  </div>
                  <div className="mt-1 flex gap-3 text-xs">
                    {u.pending > 0 && <span className="text-amber-600 dark:text-amber-400">Pending {formatSAR(u.pending)}</span>}
                    {u.paid > 0 && <span className="text-green-600 dark:text-green-400">Paid {formatSAR(u.paid)}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Detail rows */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead className="hidden md:table-cell">Customer</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Deal Profit</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.deal.dealNumber}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{r.deal.customer.name}</TableCell>
                    <TableCell className="text-sm">{r.user.fullName}</TableCell>
                    <TableCell className="hidden sm:table-cell text-right font-mono text-sm text-muted-foreground">{formatSAR(r.deal.profit)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{r.percent.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">{formatSAR(r.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={r.payoutStatus === "PAID" ? "success" : "warning"}>
                        {r.payoutStatus === "PAID" ? "Paid" : "Pending"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {r.payoutStatus === "PENDING" && (
                          <button onClick={() => payIds([r.id])} disabled={!!payingIds}
                            className="text-[11px] text-primary hover:underline disabled:opacity-50">
                            Mark Paid
                          </button>
                        )}
                        {r.payoutStatus === "PAID" && r.paidAt && (
                          <span className="text-[10px] text-muted-foreground">{formatDate(r.paidAt)}</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      })}
    </div>
  );
}
