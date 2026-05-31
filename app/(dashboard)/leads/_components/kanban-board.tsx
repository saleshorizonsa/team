"use client";

import { useState } from "react";
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LeadCard } from "./lead-card";
import { LostDialog } from "./lost-dialog";
import { WonDialog } from "./won-dialog";
import { STAGE_ORDER, STAGE_CONFIG, type Lead, type LeadStage } from "./lead-types";

interface ColumnProps {
  stage: LeadStage;
  leads: Lead[];
  canEditLead: (lead: Lead) => boolean;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
}

function KanbanColumn({ stage, leads, canEditLead, onEdit, onDelete }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const cfg = STAGE_CONFIG[stage];
  const total = leads.reduce((s, l) => s + Number(l.estimatedValue), 0);

  return (
    <div className="flex flex-col min-w-[220px] w-[220px] shrink-0">
      {/* Column header */}
      <div className={cn("rounded-t-lg px-3 py-2 mb-2", cfg.bg)}>
        <div className="flex items-center justify-between">
          <span className={cn("text-xs font-semibold uppercase tracking-wide", cfg.color)}>
            {cfg.label}
          </span>
          <span className={cn("text-xs font-medium rounded-full px-1.5 py-0.5 bg-white/50 dark:bg-black/20", cfg.color)}>
            {leads.length}
          </span>
        </div>
        {leads.length > 0 && (
          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
            SAR {total.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 rounded-b-lg p-2 min-h-[120px] transition-colors",
          isOver ? "bg-primary/5 ring-1 ring-primary/30" : "bg-muted/30"
        )}
      >
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            canEdit={canEditLead(lead)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  leads: Lead[];
  onLeadsChange: (leads: Lead[]) => void;
  canEditLead: (lead: Lead) => boolean;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
}

export function KanbanBoard({ leads, onLeadsChange, canEditLead, onEdit, onDelete }: KanbanBoardProps) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [lostPending, setLostPending] = useState<{ lead: Lead } | null>(null);
  const [wonLead, setWonLead] = useState<Lead | null>(null);

  function handleDragStart({ active }: DragStartEvent) {
    setActiveLead(leads.find((l) => l.id === String(active.id)) ?? null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveLead(null);
    if (!over) return;
    const lead = leads.find((l) => l.id === String(active.id));
    if (!lead) return;
    const newStage = over.id as LeadStage;
    if (newStage === lead.stage) return;

    if (newStage === "LOST") {
      setLostPending({ lead });
      return;
    }

    applyStageChange(lead, newStage);

    if (newStage === "WON") {
      setWonLead(lead);
    }
  }

  async function applyStageChange(lead: Lead, stage: LeadStage, lostReason?: string) {
    // Optimistic update
    onLeadsChange(leads.map((l) => l.id === lead.id ? { ...l, stage, lostReason: lostReason ?? null } : l));

    try {
      const res = await fetch(`/api/leads/${lead.id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, lostReason }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      onLeadsChange(leads.map((l) => l.id === lead.id ? updated : l));
    } catch (e) {
      // Revert on failure
      onLeadsChange(leads.map((l) => l.id === lead.id ? lead : l));
      toast.error(e instanceof Error ? e.message : "Stage update failed");
    }
  }

  async function handleLostConfirm(lostReason: string) {
    if (!lostPending) return;
    await applyStageChange(lostPending.lead, "LOST", lostReason);
    setLostPending(null);
  }

  return (
    <>
      <DndContext
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGE_ORDER.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              leads={leads.filter((l) => l.stage === stage)}
              canEditLead={canEditLead}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead && (
            <div className="w-[220px] opacity-90 rotate-1 shadow-2xl">
              <LeadCard
                lead={activeLead}
                canEdit={false}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <LostDialog
        open={!!lostPending}
        onClose={() => setLostPending(null)}
        onConfirm={handleLostConfirm}
      />

      <WonDialog
        open={!!wonLead}
        onClose={() => setWonLead(null)}
        lead={wonLead}
      />
    </>
  );
}
