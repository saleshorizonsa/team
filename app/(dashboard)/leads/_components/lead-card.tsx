"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, Trash2, DollarSign } from "lucide-react";
import { cn, formatSAR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SOURCE_LABELS, type Lead } from "./lead-types";

interface Props {
  lead: Lead;
  canEdit: boolean;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
}

export function LeadCard({ lead, canEdit, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    disabled: !canEdit,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "group rounded-lg border bg-card p-3 shadow-sm transition-shadow",
        isDragging ? "opacity-50 shadow-lg ring-2 ring-primary" : "hover:shadow-md",
        canEdit && "cursor-grab active:cursor-grabbing"
      )}
    >
      {/* Drag handle area */}
      <div {...listeners} className="mb-2">
        <p className="text-sm font-medium leading-snug line-clamp-2">{lead.title}</p>
      </div>

      {lead.customer && (
        <p className="text-xs text-muted-foreground mb-2 truncate">{lead.customer.name}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {SOURCE_LABELS[lead.source]}
          </Badge>
        </div>
        <span className="text-xs font-mono font-medium text-muted-foreground">
          {formatSAR(Number(lead.estimatedValue))}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{lead.owner.fullName}</span>
        {canEdit && (
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
