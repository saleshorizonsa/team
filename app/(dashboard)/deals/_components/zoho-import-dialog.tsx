"use client";

import { useState, useCallback } from "react";
import { Loader2, Search, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn, formatSAR, formatDate } from "@/lib/utils";

interface InvoiceListItem {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  status: string;
  total: number;
  subTotal: number;
  currency: string;
  alreadyImported: boolean;
  importedAs: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  users: { id: string; fullName: string }[];
}

export function ZohoImportDialog({ open, onClose, onImported, users }: Props) {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [list, setList] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [salespersonIds, setSalespersonIds] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");

  const search = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q) params.set("q", q);
      const res = await fetch(`/api/zoho/invoices?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load invoices");
      setList(data.invoices);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  const selectable = list.filter((i) => !i.alreadyImported);
  const allSelected = selectable.length > 0 && selectable.every((i) => selected.has(i.invoiceId));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectable.map((i) => i.invoiceId)));
  }

  async function importSelected() {
    if (salespersonIds.length === 0) { toast.error("Select at least one salesperson to credit"); return; }
    if (selected.size === 0) { toast.error("Select at least one invoice"); return; }
    setImporting(true);
    let ok = 0, fail = 0;
    const ids = [...selected];
    try {
      for (let i = 0; i < ids.length; i++) {
        setProgress(`Importing ${i + 1} of ${ids.length}…`);
        try {
          const res = await fetch("/api/zoho/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invoiceId: ids[i], salespersonIds, purchaseTotal: "" }),
          });
          if (res.ok) ok++; else fail++;
        } catch { fail++; }
      }
      toast.success(`Imported ${ok} deal(s)${fail ? `, ${fail} failed` : ""}`);
      onImported();
    } finally {
      setImporting(false);
      setProgress("");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Import from Zoho Books"
      description="Read-only. Select invoices to pull into new DRAFT deals. Amount shown is the invoice total; each deal uses the pre-tax subtotal, with VAT recorded separately."
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-32">
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </Select>
          </div>
          <div className="flex-1 min-w-[160px] space-y-1">
            <Label className="text-xs">Search</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Invoice # or customer"
              onKeyDown={(e) => { if (e.key === "Enter") search(); }} />
          </div>
          <Button onClick={search} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
          </Button>
        </div>

        {/* List with checkboxes */}
        <div className="rounded-lg border overflow-hidden">
          {list.length > 0 && (
            <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-input" />
              <span>Select all importable</span>
              <span className="ml-auto text-muted-foreground">{selected.size} selected</span>
            </div>
          )}
          <div className="max-h-72 overflow-y-auto divide-y">
            {list.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {loading ? "Loading…" : "Search to list invoices from Zoho."}
              </p>
            ) : list.map((inv) => (
              <label
                key={inv.invoiceId}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm",
                  inv.alreadyImported ? "opacity-50" : "cursor-pointer hover:bg-accent"
                )}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input shrink-0"
                  disabled={inv.alreadyImported}
                  checked={selected.has(inv.invoiceId)}
                  onChange={() => toggle(inv.invoiceId)}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate">
                    <span className="font-mono text-xs font-medium">{inv.invoiceNumber}</span>
                    <span className="text-muted-foreground"> · {inv.customerName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(inv.date)} · {inv.status}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono">{formatSAR(inv.total)}</div>
                  {inv.alreadyImported && <Badge variant="secondary" className="mt-0.5">Imported {inv.importedAs}</Badge>}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Bulk action footer */}
        <div className="space-y-2 border-t pt-4">
          <Label className="text-xs">Credit Salespeople * <span className="font-normal text-muted-foreground">(share the pool equally)</span></Label>
          <div className="flex flex-wrap gap-2">
            {users.map((u) => {
              const checked = salespersonIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSalespersonIds((prev) => checked ? prev.filter((x) => x !== u.id) : [...prev, u.id])}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    checked ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  {u.fullName}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            {progress && <span className="text-xs text-muted-foreground">{progress}</span>}
            <Button variant="outline" onClick={onClose} disabled={importing}>Close</Button>
            <Button onClick={importSelected} disabled={importing || selected.size === 0}>
              {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
              Import {selected.size || ""} as DRAFT
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Imported deals are created as <strong>DRAFT</strong> with purchase cost 0 — edit each deal to set the
          purchase cost, then approve it to generate commissions on the net profit.
        </p>
      </div>
    </Dialog>
  );
}
