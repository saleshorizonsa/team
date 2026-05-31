"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { leadSchema, type LeadInput, leadSources, leadStages } from "@/lib/validations";
import { SOURCE_LABELS, STAGE_CONFIG, type Lead } from "./lead-types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (lead: Lead) => void;
  initial?: Lead | null;
  customers: { id: string; name: string }[];
  defaultStage?: string;
}

export function LeadFormDialog({ open, onClose, onSaved, initial, customers, defaultStage }: Props) {
  const isEdit = !!initial;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadInput>({ resolver: zodResolver(leadSchema) });

  useEffect(() => {
    if (open) {
      reset({
        title: initial?.title ?? "",
        customerId: initial?.customerId ?? "",
        contactName: initial?.contactName ?? "",
        phone: initial?.phone ?? "",
        email: initial?.email ?? "",
        source: initial?.source ?? "CALL",
        stage: (initial?.stage ?? defaultStage ?? "NEW") as LeadInput["stage"],
        estimatedValue: initial?.estimatedValue != null
          ? String(initial.estimatedValue)
          : "",
        notes: initial?.notes ?? "",
        lostReason: initial?.lostReason ?? "",
      });
    }
  }, [open, initial, defaultStage, reset]);

  async function onSubmit(data: LeadInput) {
    try {
      const url = isEdit ? `/api/leads/${initial!.id}` : "/api/leads";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Request failed");
      const saved = await res.json();
      toast.success(isEdit ? "Lead updated" : "Lead created");
      onSaved(saved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Lead" : "New Lead"}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Title */}
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" {...register("title")} placeholder="Brief description of the opportunity" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          {/* Customer */}
          <div className="space-y-1.5">
            <Label htmlFor="customerId">Customer</Label>
            <Select id="customerId" {...register("customerId")}>
              <option value="">— None —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label htmlFor="source">Source *</Label>
            <Select id="source" {...register("source")}>
              {leadSources.map((s) => (
                <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
              ))}
            </Select>
            {errors.source && <p className="text-xs text-destructive">{errors.source.message}</p>}
          </div>

          {/* Contact Name */}
          <div className="space-y-1.5">
            <Label htmlFor="contactName">Contact Name</Label>
            <Input id="contactName" {...register("contactName")} placeholder="Contact at company" />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} placeholder="+966 5X XXX XXXX" />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} placeholder="contact@company.com" />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          {/* Estimated Value */}
          <div className="space-y-1.5">
            <Label htmlFor="estimatedValue">Estimated Value (SAR) *</Label>
            <Input
              id="estimatedValue"
              {...register("estimatedValue")}
              placeholder="0.00"
              className="font-mono"
            />
            {errors.estimatedValue && (
              <p className="text-xs text-destructive">{errors.estimatedValue.message}</p>
            )}
          </div>

          {/* Stage (edit only) */}
          {isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="stage">Stage</Label>
              <Select id="stage" {...register("stage")}>
                {leadStages.map((s) => (
                  <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>
                ))}
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} placeholder="Additional context…" rows={3} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Lead"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
