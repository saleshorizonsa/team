"use client";

import { useState, useCallback } from "react";
import {
  TrendingUp, DollarSign, Receipt, Handshake, Wallet, Clock, Star, Loader2, RotateCcw,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn, formatSAR } from "@/lib/utils";
import type { DashboardData } from "@/lib/dashboard";
import { ProfitChart, StatusChart, CommissionChart } from "./dashboard-charts";

interface Props {
  initialData: DashboardData;
  users: { id: string; fullName: string }[];
  currentUserName: string;
}

const KPI_META = [
  { key: "totalSales", label: "Total Sales", icon: TrendingUp, tint: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400" },
  { key: "totalProfit", label: "Gross Profit", icon: DollarSign, tint: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400" },
  { key: "totalReturns", label: "Returns", icon: RotateCcw, tint: "text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400" },
  { key: "netProfit", label: "Net Profit", icon: DollarSign, tint: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400" },
  { key: "totalVat", label: "Total VAT", icon: Receipt, tint: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400" },
  { key: "dealCount", label: "Approved Deals", icon: Handshake, tint: "text-violet-600 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-400", count: true },
  { key: "totalCommissions", label: "Total Commissions", icon: Wallet, tint: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400" },
  { key: "pendingPayouts", label: "Pending Payouts", icon: Clock, tint: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400" },
] as const;

export function DashboardClient({ initialData, users, currentUserName }: Props) {
  const [data, setData] = useState(initialData);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (f: string, t: string, sp: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f) params.set("from", f);
      if (t) params.set("to", t);
      if (sp) params.set("salespersonId", sp);
      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  function onFilterChange(next: { f?: string; t?: string; sp?: string }) {
    const f = next.f ?? from, t = next.t ?? to, sp = next.sp ?? salespersonId;
    setFrom(f); setTo(t); setSalespersonId(sp);
    refresh(f, t, sp);
  }

  function clearFilters() {
    setFrom(""); setTo(""); setSalespersonId("");
    refresh("", "", "");
  }

  const k = data.kpis;
  const hasFilters = !!(from || to || salespersonId);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Company-wide performance — visible to everyone">
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" value={from} onChange={(e) => onFilterChange({ f: e.target.value })} className="h-9 w-40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" value={to} onChange={(e) => onFilterChange({ t: e.target.value })} className="h-9 w-40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Salesperson</label>
          <Select value={salespersonId} onChange={(e) => onFilterChange({ sp: e.target.value })} className="h-9 w-44">
            <option value="">All</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </Select>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Highlighted: your commission */}
        <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-primary flex items-center gap-1.5">
              <Star className="h-4 w-4" /> Your Commission
            </p>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">{formatSAR(k.myCommission)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{currentUserName}</p>
        </div>

        {KPI_META.map((m) => {
          const raw = k[m.key] as number;
          return (
            <div key={m.key} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{m.label}</p>
                <span className={cn("rounded-lg p-1.5", m.tint)}><m.icon className="h-4 w-4" /></span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {"count" in m && m.count ? raw : formatSAR(raw)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">Sales &amp; Profit Over Time</h3>
          <ProfitChart data={data.profitOverTime} />
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold">Deals by Status</h3>
          <StatusChart data={data.dealsByStatus} />
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold">Commission by Person</h3>
          <CommissionChart data={data.commissionByPerson} />
        </div>
      </div>
    </div>
  );
}
