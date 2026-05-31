"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Search, FileText } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { dealSchema, type DealInput } from "@/lib/validations";
import type { CommissionRules, CommissionParticipant } from "@/lib/commission";
import { ProfitPreview } from "./profit-preview";
import { formatSAR, formatDate } from "@/lib/utils";
import type { Deal } from "./deal-types";

export interface DealFormPrefill {
  customerId?: string;
  salespersonId?: string;
  leadId?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (deal: Deal) => void;
  initial?: Deal | null;
  prefill?: DealFormPrefill | null;
  customers: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  users: { id: string; fullName: string }[];
  rules: CommissionRules;
  participants: CommissionParticipant[];
  defaultVatRate: number;
  isAdmin: boolean;
}

interface PurchaseOrder {
  id: string;
  number: string;
  vendorName: string;
  date: string;
  total: number;
  status: string;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function DealFormDialog({
  open, onClose, onSaved, initial, prefill,
  customers, suppliers, users, rules, participants, defaultVatRate, isAdmin,
}: Props) {
  const isEdit = !!initial;

  // Zoho Purchase Order picker (admin) — fills purchaseTotal
  const [poOpen, setPoOpen] = useState(false);
  const [poList, setPoList] = useState<PurchaseOrder[]>([]);
  const [poLoading, setPoLoading] = useState(false);
  const [poSearch, setPoSearch] = useState("");

  async function loadPOs() {
    setPoLoading(true);
    try {
      const res = await fetch(`/api/zoho/purchaseorders?q=${encodeURIComponent(poSearch)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load purchase orders");
      setPoList(data.purchaseOrders);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setPoLoading(false);
    }
  }

  const {
    register, handleSubmit, reset, control, setValue,
    formState: { errors, isSubmitting },
  } = useForm<DealInput>({ resolver: zodResolver(dealSchema) });

  useEffect(() => {
    if (open) {
      setPoOpen(false); setPoList([]); setPoSearch("");
      const initialReps =
        initial?.creditedUserIds && initial.creditedUserIds.length
          ? initial.creditedUserIds
          : initial?.salespersonId
          ? [initial.salespersonId]
          : prefill?.salespersonId
          ? [prefill.salespersonId]
          : [];
      reset({
        customerId: initial?.customerId ?? prefill?.customerId ?? "",
        supplierId: initial?.supplierId ?? "",
        salespersonIds: initialReps,
        leadId: initial?.leadId ?? prefill?.leadId ?? "",
        dealDate: initial?.dealDate
          ? new Date(initial.dealDate).toISOString().slice(0, 10)
          : todayISO(),
        salesTotal: initial?.salesTotal != null ? String(initial.salesTotal) : "",
        purchaseTotal: initial?.purchaseTotal != null ? String(initial.purchaseTotal) : "",
        transportation: initial?.transportation != null ? String(initial.transportation) : "0",
        vatRatePercent: initial?.vatRatePercent != null ? String(initial.vatRatePercent) : String(defaultVatRate),
        notes: initial?.notes ?? "",
      });
    }
  }, [open, initial, prefill, defaultVatRate, reset]);

  // Live values for the preview
  const watched = useWatch({ control });
  const selectedReps = (watched.salespersonIds as string[] | undefined) ?? [];

  async function onSubmit(data: DealInput) {
    try {
      const url = isEdit ? `/api/deals/${initial!.id}` : "/api/deals";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Request failed");
      const saved = await res.json();
      toast.success(isEdit ? "Deal updated" : `Deal ${saved.dealNumber} created`);
      onSaved(saved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit Deal ${initial?.dealNumber ?? ""}` : "New Deal"}
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          {/* ── Left: fields ── */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="customerId">Customer *</Label>
              <Select id="customerId" {...register("customerId")}>
                <option value="">— Select customer —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              {errors.customerId && <p className="text-xs text-destructive">{errors.customerId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="supplierId">Supplier</Label>
              <Select id="supplierId" {...register("supplierId")}>
                <option value="">— None —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Salespeople * <span className="font-normal text-muted-foreground">(share the pool by their %)</span></Label>
              <div className="rounded-md border divide-y max-h-40 overflow-y-auto">
                {users.map((u) => {
                  const checked = selectedReps.includes(u.id);
                  return (
                    <label key={u.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input shrink-0"
                        checked={checked}
                        onChange={() => {
                          const next = checked ? selectedReps.filter((x) => x !== u.id) : [...selectedReps, u.id];
                          setValue("salespersonIds", next, { shouldValidate: true });
                        }}
                      />
                      {u.fullName}
                    </label>
                  );
                })}
              </div>
              {errors.salespersonIds && <p className="text-xs text-destructive">{errors.salespersonIds.message as string}</p>}
              {selectedReps.length > 1 && (
                <p className="text-[11px] text-muted-foreground">
                  Sales pool split by each rep&apos;s share % (Settings → Commission Rules) — see the breakdown below.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dealDate">Deal Date *</Label>
              <Input id="dealDate" type="date" {...register("dealDate")} />
              {errors.dealDate && <p className="text-xs text-destructive">{errors.dealDate.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="salesTotal">Sales Total *</Label>
                <Input id="salesTotal" inputMode="decimal" {...register("salesTotal")} placeholder="0.00" className="font-mono" />
                {errors.salesTotal && <p className="text-xs text-destructive">{errors.salesTotal.message}</p>}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="purchaseTotal">Purchase Total *</Label>
                  {isAdmin && (
                    <button type="button" onClick={() => { setPoOpen((o) => !o); if (!poOpen && poList.length === 0) loadPOs(); }}
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                      <FileText className="h-3 w-3" /> Pick from PO
                    </button>
                  )}
                </div>
                <Input id="purchaseTotal" inputMode="decimal" {...register("purchaseTotal")} placeholder="0.00" className="font-mono" />
                {errors.purchaseTotal && <p className="text-xs text-destructive">{errors.purchaseTotal.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="transportation">Transportation</Label>
                <Input id="transportation" inputMode="decimal" {...register("transportation")} placeholder="0.00" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vatRatePercent">VAT Rate (%)</Label>
                <Input id="vatRatePercent" inputMode="decimal" {...register("vatRatePercent")} placeholder="15" className="font-mono" />
                {errors.vatRatePercent && <p className="text-xs text-destructive">{errors.vatRatePercent.message}</p>}
              </div>
            </div>

            {/* Zoho Purchase Order picker */}
            {isAdmin && poOpen && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input value={poSearch} onChange={(e) => setPoSearch(e.target.value)} placeholder="Search PO # or vendor"
                    className="h-8" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); loadPOs(); } }} />
                  <Button type="button" size="sm" variant="outline" onClick={loadPOs} disabled={poLoading}>
                    {poLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <div className="max-h-40 overflow-y-auto rounded-md border bg-background divide-y">
                  {poList.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">{poLoading ? "Loading…" : "No purchase orders found."}</p>
                  ) : poList.map((po) => (
                    <button key={po.id} type="button"
                      onClick={() => { setValue("purchaseTotal", String(po.total), { shouldValidate: true }); setPoOpen(false); toast.success(`Purchase cost set from ${po.number}`); }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent">
                      <span>
                        <span className="font-mono text-xs">{po.number}</span>
                        <span className="text-muted-foreground"> · {po.vendorName}</span>
                        <span className="block text-[11px] text-muted-foreground">{formatDate(po.date)} · {po.status}</span>
                      </span>
                      <span className="font-mono">{formatSAR(po.total)}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">Selecting a PO fills the purchase cost. You can still edit it.</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register("notes")} rows={2} placeholder="Optional notes…" />
            </div>
          </div>

          {/* ── Right: live preview ── */}
          <div>
            <ProfitPreview
              salesTotal={watched.salesTotal ?? ""}
              purchaseTotal={watched.purchaseTotal ?? ""}
              transportation={watched.transportation ?? "0"}
              vatRatePercent={watched.vatRatePercent ?? String(defaultVatRate)}
              creditedUserIds={selectedReps}
              rules={rules}
              participants={participants}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Deal"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
