"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function DealFormDialog({
  open, onClose, onSaved, initial, prefill,
  customers, suppliers, users, rules, participants, defaultVatRate,
}: Props) {
  const isEdit = !!initial;

  const {
    register, handleSubmit, reset, control,
    formState: { errors, isSubmitting },
  } = useForm<DealInput>({ resolver: zodResolver(dealSchema) });

  useEffect(() => {
    if (open) {
      reset({
        customerId: initial?.customerId ?? prefill?.customerId ?? "",
        supplierId: initial?.supplierId ?? "",
        salespersonId: initial?.salespersonId ?? prefill?.salespersonId ?? "",
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
              <Label htmlFor="salespersonId">Salesperson *</Label>
              <Select id="salespersonId" {...register("salespersonId")}>
                <option value="">— Select salesperson —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </Select>
              {errors.salespersonId && <p className="text-xs text-destructive">{errors.salespersonId.message}</p>}
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
                <Label htmlFor="purchaseTotal">Purchase Total *</Label>
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
              salespersonId={watched.salespersonId ?? ""}
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
