"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, Send, Check, X, Eye, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Deal, DealStatus } from "./deal-types";

interface Props {
  deal: Deal;
  isAdmin: boolean;
  sessionUserId: string;
  onEdit: (d: Deal) => void;
  onView: (d: Deal) => void;
  onDelete: (d: Deal) => void;
  onSubmit: (d: Deal) => void;
  onApprove: (d: Deal) => void;
  onReject: (d: Deal) => void;
  onReturn: (d: Deal) => void;
}

export function DealActions({
  deal, isAdmin, sessionUserId,
  onEdit, onView, onDelete, onSubmit, onApprove, onReject, onReturn,
}: Props) {
  const [open, setOpen] = useState(false);
  const isOwner = deal.createdById === sessionUserId;
  const status = deal.status as DealStatus;

  // Capability matrix
  const canEdit =
    isAdmin || (isOwner && (status === "DRAFT" || status === "REJECTED"));
  const canDelete =
    isAdmin || (isOwner && (status === "DRAFT" || status === "REJECTED"));
  const canSubmit =
    (isAdmin || isOwner) && (status === "DRAFT" || status === "REJECTED");
  const canApproveReject = isAdmin && status === "SUBMITTED";
  const canReturn = isAdmin && status === "APPROVED";

  type Item = { label: string; icon: typeof Pencil; onClick: () => void; danger?: boolean; accent?: boolean };
  const items: Item[] = [
    { label: "View", icon: Eye, onClick: () => onView(deal) },
    ...(canEdit ? [{ label: "Edit", icon: Pencil, onClick: () => onEdit(deal) }] : []),
    ...(canSubmit ? [{ label: status === "REJECTED" ? "Resubmit" : "Submit", icon: Send, onClick: () => onSubmit(deal), accent: true }] : []),
    ...(canApproveReject ? [{ label: "Approve", icon: Check, onClick: () => onApprove(deal), accent: true }] : []),
    ...(canApproveReject ? [{ label: "Reject", icon: X, onClick: () => onReject(deal), danger: true }] : []),
    ...(canReturn ? [{ label: "Record Return", icon: RotateCcw, onClick: () => onReturn(deal) }] : []),
    ...(canDelete ? [{ label: "Delete", icon: Trash2, onClick: () => onDelete(deal), danger: true }] : []),
  ];

  return (
    <div className="relative flex justify-end">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 w-40 rounded-lg border bg-popover p-1 shadow-lg">
          {items.map((it) => (
            <button
              key={it.label}
              onMouseDown={(e) => { e.preventDefault(); it.onClick(); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                it.danger
                  ? "text-destructive hover:bg-destructive/10"
                  : it.accent
                  ? "text-primary hover:bg-primary/10"
                  : "hover:bg-accent"
              )}
            >
              <it.icon className="h-3.5 w-3.5" />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
