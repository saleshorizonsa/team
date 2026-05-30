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
import { Textarea } from "@/components/ui/textarea";
import { contactSchema, type ContactInput } from "@/lib/validations";

interface ContactFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (record: Record<string, unknown>) => void;
  initial?: { id: string; name: string; contactPerson?: string | null; phone?: string | null; email?: string | null; vatNumber?: string | null; notes?: string | null } | null;
  entityType: "customer" | "supplier";
}

export function ContactFormDialog({ open, onClose, onSaved, initial, entityType }: ContactFormDialogProps) {
  const isEdit = !!initial;
  const endpoint = entityType === "customer" ? "/api/customers" : "/api/suppliers";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) });

  useEffect(() => {
    if (open) {
      reset({
        name: initial?.name ?? "",
        contactPerson: initial?.contactPerson ?? "",
        phone: initial?.phone ?? "",
        email: initial?.email ?? "",
        vatNumber: initial?.vatNumber ?? "",
        notes: initial?.notes ?? "",
      });
    }
  }, [open, initial, reset]);

  async function onSubmit(data: ContactInput) {
    try {
      const url = isEdit ? `${endpoint}/${initial!.id}` : endpoint;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Request failed");
      }
      const saved = await res.json();
      toast.success(isEdit ? `${entityType === "customer" ? "Customer" : "Supplier"} updated` : `${entityType === "customer" ? "Customer" : "Supplier"} created`);
      onSaved(saved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  const label = entityType === "customer" ? "Customer" : "Supplier";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${label}` : `New ${label}`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register("name")} placeholder={`${label} name`} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contactPerson">Contact Person</Label>
            <Input id="contactPerson" {...register("contactPerson")} placeholder="Full name" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} placeholder="+966 5X XXX XXXX" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} placeholder="contact@company.com" />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vatNumber">VAT Number</Label>
            <Input id="vatNumber" {...register("vatNumber")} placeholder="3XXXXXXXXXXXXXXXXX3" />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} placeholder="Any additional notes…" rows={3} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "Save Changes" : `Create ${label}`}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
