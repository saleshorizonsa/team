"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Printer, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { exportToExcel } from "@/lib/export";
import type { ReportType } from "@/lib/reports";

const TABS: { value: ReportType; label: string }[] = [
  { value: "sales", label: "Sales" },
  { value: "purchases", label: "Purchases" },
  { value: "profit", label: "Profit" },
  { value: "vat", label: "VAT" },
  { value: "commissions", label: "Commissions" },
];

type Row = Record<string, string | number>;

const MONEY_COLS = new Set(["Sales Total", "Purchase Total", "Transportation", "Profit", "VAT Amount", "Amount"]);

function fmtCell(col: string, val: string | number): string {
  if (typeof val === "number") {
    if (MONEY_COLS.has(col)) return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (col.includes("%")) return `${val}`;
    return String(val);
  }
  return val;
}

export function ReportsClient({ users }: { users: { id: string; fullName: string }[] }) {
  const [type, setType] = useState<ReportType>("sales");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (salespersonId) params.set("salespersonId", salespersonId);
      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load report");
      const data = await res.json();
      setRows(data.rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [type, from, to, salespersonId]);

  useEffect(() => { load(); }, [load]);

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  function doExport() {
    if (rows.length === 0) { toast.error("Nothing to export"); return; }
    const stamp = new Date().toISOString().slice(0, 10);
    exportToExcel(`${type}-report-${stamp}.xlsx`, type, rows);
    toast.success("Excel file downloaded");
  }

  function openPrint() {
    const params = new URLSearchParams({ type });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (salespersonId) params.set("salespersonId", salespersonId);
    window.open(`/print/report?${params.toString()}`, "_blank");
  }

  // numeric column totals (money columns only)
  const totals: Record<string, number> = {};
  for (const col of columns) {
    if (MONEY_COLS.has(col)) {
      totals[col] = rows.reduce((s, r) => s + (typeof r[col] === "number" ? (r[col] as number) : 0), 0);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" description="Filter, export to Excel, or print a statement">
        <Button size="sm" variant="outline" onClick={openPrint} disabled={rows.length === 0}>
          <Printer className="h-4 w-4" /> Print
        </Button>
        <Button size="sm" onClick={doExport} disabled={rows.length === 0}>
          <Download className="h-4 w-4" /> Export Excel
        </Button>
      </PageHeader>

      <Tabs value={type} onValueChange={(v) => setType(v as ReportType)}>
        <TabsList>
          {TABS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Salesperson</label>
          <Select value={salespersonId} onChange={(e) => setSalespersonId(e.target.value)} className="h-9 w-44">
            <option value="">All</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </Select>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mb-2" />}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {columns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{loading ? "Loading…" : "No records for this filter"}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c} className={MONEY_COLS.has(c) || c.includes("%") ? "text-right" : ""}>{c}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  {columns.map((c) => (
                    <TableCell key={c} className={MONEY_COLS.has(c) || c.includes("%") ? "text-right font-mono text-sm" : "text-sm"}>
                      {fmtCell(c, r[c])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {Object.keys(totals).length > 0 && (
                <TableRow className="border-t-2 font-semibold bg-muted/30">
                  {columns.map((c, idx) => (
                    <TableCell key={c} className={MONEY_COLS.has(c) ? "text-right font-mono text-sm" : "text-sm"}>
                      {idx === 0 ? "Total" : MONEY_COLS.has(c) ? totals[c].toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
                    </TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {rows.length} record(s). Financial reports include APPROVED deals only.
      </p>
    </div>
  );
}
