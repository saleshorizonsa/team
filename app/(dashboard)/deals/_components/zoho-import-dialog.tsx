"use client";

import { useState, useCallback } from "react";
import { Loader2, Search, FileDown, ArrowLeft } from "lucide-react";
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

interface Preview {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  subTotal: number;
  taxTotal: number;
  total: number;
  vatRatePercent: number;
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
  const [selected, setSelected] = useState<Preview | null>(null);
  const [salespersonId, setSalespersonId] = useState("");
  const [purchaseTotal, setPurchaseTotal] = useState("");
  const [importing, setImporting] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
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

  async function pick(inv: InvoiceListItem) {
    if (inv.alreadyImported) { toast.error(`Already imported as ${inv.importedAs}`); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/zoho/invoices/${inv.invoiceId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load invoice");
      setSelected(data.preview);
      setSalespersonId("");
      setPurchaseTotal("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function doImport() {
    if (!selected) return;
    if (!salespersonId) { toast.error("Select a salesperson to credit"); return; }
    setImporting(true);
    try {
      const res = await fetch("/api/zoho/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: selected.invoiceId, salespersonId, purchaseTotal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      toast.success(`Imported as ${data.dealNumber} (DRAFT)`);
      onImported();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Import from Zoho Books"
      description="Read-only. Pull a selected invoice into a new DRAFT deal."
      className="max-w-2xl"
    >
      {!selected ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-36">
                <option value="">All</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="draft">Draft</option>
              </Select>
            </div>
            <div className="flex-1 min-w-[180px] space-y-1">
              <Label className="text-xs">Search</Label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Invoice # or customer" />
            </div>
            <Button onClick={search} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
            </Button>
          </div>

          <div className="rounded-lg border max-h-80 overflow-y-auto divide-y">
            {list.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {loading ? "Loading…" : "Search to list invoices from Zoho."}
              </p>
            ) : list.map((inv) => (
              <button
                key={inv.invoiceId}
                onClick={() => pick(inv)}
                disabled={inv.alreadyImported}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors",
                  inv.alreadyImported ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"
                )}
              >
                <div>
                  <span className="font-mono text-xs font-medium">{inv.invoiceNumber}</span>
                  <span className="text-muted-foreground"> · {inv.customerName}</span>
                  <p className="text-xs text-muted-foreground">{formatDate(inv.date)} · {inv.status}</p>
                </div>
                <div className="text-right">
                  <div className="font-mono">{formatSAR(inv.subTotal)}</div>
                  {inv.alreadyImported && <Badge variant="secondary" className="mt-0.5">Imported {inv.importedAs}</Badge>}
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to list
          </button>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span className="font-mono">{selected.invoiceNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{selected.customerName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{formatDate(selected.date)}</span></div>
            <div className="flex justify-between border-t pt-1.5"><span className="text-muted-foreground">Sales Total (pre-tax)</span><span className="font-mono font-medium">{formatSAR(selected.subTotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">VAT ({selected.vatRatePercent}%)</span><span className="font-mono">{formatSAR(selected.taxTotal)}</span></div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sp">Credit Salesperson *</Label>
              <Select id="sp" value={salespersonId} onChange={(e) => setSalespersonId(e.target.value)}>
                <option value="">— Select —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt">Purchase Cost (manual)</Label>
              <Input id="pt" inputMode="decimal" value={purchaseTotal} onChange={(e) => setPurchaseTotal(e.target.value)} placeholder="0.00" className="font-mono" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Invoices carry the sales side only. Enter the purchase cost manually (or leave 0 and edit
            the deal later). The deal is created as <strong>DRAFT</strong> and goes through normal approval.
          </p>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => setSelected(null)} disabled={importing}>Cancel</Button>
            <Button onClick={doImport} disabled={importing}>
              {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
              Import as Deal
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
