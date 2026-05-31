"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { DollarSign, CheckCircle2, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { cn, formatSAR, formatDate } from "@/lib/utils";

type CommissionType = "EARNING" | "CLAWBACK";

interface CommissionRow {
  id: string;
  period: string;
  type: CommissionType;
  percent: number;
  amount: number; // negative for CLAWBACK
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

function monthBounds(period: string): { from: string; to: string } {
  const [y, m] = period.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${period}-01`, to: `${period}-${String(lastDay).padStart(2, "0")}` };
}

export function CommissionsClient({ initialCommissions, isAdmin, sessionUserId }: Props) {
  const [commissions, setCommissions] = useState(initialCommissions);
  const [periodFilter, setPeriodFilter] = useState("");
  const [payingIds, setPayingIds] = useState<string[] | null>(null);

  const periods = useMemo(
    () => [...new Set(commissions.map((c) => c.period))].sort().reverse(),
    [commissions]
  );

  // Cumulative carried balance per user across ALL periods (chronological),
  // so a negative period offsets future periods.
  const carried = useMemo(() => {
    const periodsAsc = [...new Set(commissions.map((c) => c.period))].sort();
    const byUserPeriod = new Map<string, Map<string, number>>();
    for (const c of commissions) {
      if (!byUserPeriod.has(c.user.id)) byUserPeriod.set(c.user.id, new Map());
      const m = byUserPeriod.get(c.user.id)!;
      m.set(c.period, (m.get(c.period) ?? 0) + c.amount);
    }
    const cumulative = new Map<string, Map<string, number>>();
    for (const [uid, m] of byUserPeriod) {
      const run = new Map<string, number>();
      let acc = 0;
      for (const p of periodsAsc) {
        acc += m.get(p) ?? 0;
        run.set(p, acc);
      }
      cumulative.set(uid, run);
    }
    return cumulative;
  }, [commissions]);

  const visible = useMemo(
    () => (periodFilter ? commissions.filter((c) => c.period === periodFilter) : commissions),
    [commissions, periodFilter]
  );

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
      toast.success(`Settled ${ids.length} commission line(s)`);
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
      <PageHeader title="Commissions" description="Per-period statements — earnings and return clawbacks, visible to everyone">
        <Select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="w-44 h-9">
          <option value="">All Periods</option>
          {periods.map((p) => <option key={p} value={p}>{periodLabel(p)}</option>)}
        </Select>
      </PageHeader>

      {grouped.map(([period, rows]) => {
        const net = rows.reduce((s, r) => s + r.amount, 0);
        const pending = rows.filter((r) => r.payoutStatus === "PENDING");
        const pendingNet = pending.reduce((s, r) => s + r.amount, 0);

        const byUser = new Map<string, {
          name: string; role: string; earnings: number; clawbacks: number; net: number; pendingIds: string[];
        }>();
        for (const r of rows) {
          if (!byUser.has(r.user.id))
            byUser.set(r.user.id, { name: r.user.fullName, role: r.user.role, earnings: 0, clawbacks: 0, net: 0, pendingIds: [] });
          const e = byUser.get(r.user.id)!;
          if (r.type === "CLAWBACK") e.clawbacks += r.amount; else e.earnings += r.amount;
          e.net += r.amount;
          if (r.payoutStatus === "PENDING") e.pendingIds.push(r.id);
        }

        return (
          <div key={period} className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
              <div>
                <h3 className="font-semibold">{periodLabel(period)}</h3>
                <p className="text-xs text-muted-foreground">
                  {rows.length} line(s) · Net {formatSAR(net)} · Pending {formatSAR(pendingNet)}
                </p>
              </div>
              {isAdmin && pending.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => payIds(pending.map((r) => r.id))} disabled={!!payingIds}>
                  {payingIds ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Settle Period
                </Button>
              )}
            </div>

            {/* Per-user summary with carried balance */}
            <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
              {[...byUser.entries()].map(([uid, u]) => {
                const balance = carried.get(uid)?.get(period) ?? u.net;
                const bounds = monthBounds(period);
                const canPrint = isAdmin || uid === sessionUserId;
                return (
                  <div key={uid} className="bg-card p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-1.5">
                        <span className={cn("inline-block h-1.5 w-1.5 rounded-full", u.role === "ADMIN" ? "bg-purple-500" : "bg-primary")} />
                        {u.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {canPrint && (
                          <Link
                            href={`/print/payout?userId=${uid}&from=${bounds.from}&to=${bounds.to}`}
                            target="_blank"
                            className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-primary hover:underline"
                            title="Print payout statement for this period"
                          >
                            <Printer className="h-3 w-3" /> Statement
                          </Link>
                        )}
                        {isAdmin && u.pendingIds.length > 0 && (
                          <button onClick={() => payIds(u.pendingIds)} disabled={!!payingIds}
                            className="text-[11px] text-primary hover:underline disabled:opacity-50">Settle</button>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                      {u.earnings !== 0 && <span className="text-green-600 dark:text-green-400">Earned {formatSAR(u.earnings)}</span>}
                      {u.clawbacks !== 0 && <span className="text-red-600 dark:text-red-400">Clawback {formatSAR(u.clawbacks)}</span>}
                      <span className={cn("font-medium", u.net >= 0 ? "text-foreground" : "text-red-600 dark:text-red-400")}>
                        Net {formatSAR(u.net)}
                      </span>
                    </div>
                    <p className={cn("mt-0.5 text-[11px]", balance < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                      Balance to date: {formatSAR(balance)}{balance < 0 ? " (carried forward)" : ""}
                    </p>
                  </div>
                );
              })}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead className="hidden md:table-cell">Customer</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
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
                    <TableCell>
                      <Badge variant={r.type === "CLAWBACK" ? "destructive" : "secondary"}>
                        {r.type === "CLAWBACK" ? "Clawback" : "Earning"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{r.percent.toFixed(1)}%</TableCell>
                    <TableCell className={cn("text-right font-mono text-sm font-medium", r.amount < 0 && "text-red-600 dark:text-red-400")}>
                      {formatSAR(r.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.payoutStatus === "PAID" ? "success" : "warning"}>
                        {r.payoutStatus === "PAID" ? "Settled" : "Pending"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {r.payoutStatus === "PENDING" ? (
                          <button onClick={() => payIds([r.id])} disabled={!!payingIds}
                            className="text-[11px] text-primary hover:underline disabled:opacity-50">Settle</button>
                        ) : r.paidAt ? (
                          <span className="text-[10px] text-muted-foreground">{formatDate(r.paidAt)}</span>
                        ) : null}
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
