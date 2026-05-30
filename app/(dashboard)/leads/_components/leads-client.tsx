"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, TrendingUp, LayoutGrid, List, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { KanbanBoard } from "./kanban-board";
import { LeadFormDialog } from "./lead-form-dialog";
import { STAGE_CONFIG, SOURCE_LABELS, type Lead, type LeadStage, type LeadSource } from "./lead-types";
import { formatDate, formatSAR, cn } from "@/lib/utils";

interface Props {
  initialLeads: Lead[];
  customers: { id: string; name: string }[];
  users: { id: string; fullName: string }[];
  sessionUserId: string;
  isAdmin: boolean;
}

export function LeadsClient({ initialLeads, customers, users, sessionUserId, isAdmin }: Props) {
  const [leads, setLeads] = useState(initialLeads);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<LeadStage | "">("");
  const [filterSource, setFilterSource] = useState<LeadSource | "">("");
  const [filterOwner, setFilterOwner] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState<Lead | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canEditLead = useCallback(
    (lead: Lead) => {
      if (isAdmin) return true;
      if (lead.ownerId !== sessionUserId) return false;
      return !["WON", "LOST"].includes(lead.stage);
    },
    [isAdmin, sessionUserId]
  );

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const q = search.toLowerCase();
      if (q && !l.title.toLowerCase().includes(q) && !l.customer?.name.toLowerCase().includes(q)) return false;
      if (filterStage && l.stage !== filterStage) return false;
      if (filterSource && l.source !== filterSource) return false;
      if (filterOwner && l.ownerId !== filterOwner) return false;
      return true;
    });
  }, [leads, search, filterStage, filterSource, filterOwner]);

  function openCreate() { setEditing(null); setFormOpen(true); }
  function openEdit(lead: Lead) { setEditing(lead); setFormOpen(true); }

  function onSaved(saved: Lead) {
    setLeads((prev) => {
      const idx = prev.findIndex((l) => l.id === saved.id);
      return idx >= 0 ? prev.map((l) => (l.id === saved.id ? saved : l)) : [saved, ...prev];
    });
    setFormOpen(false);
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/leads/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setLeads((prev) => prev.filter((l) => l.id !== deleting.id));
      toast.success("Lead deleted");
      setDeleting(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  }

  const stageCfg = (s: LeadStage) => STAGE_CONFIG[s];

  return (
    <div className="space-y-5">
      <PageHeader title="Leads" description={`${leads.length} total`}>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Lead
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search leads…" className="w-48" />

        <Select value={filterStage} onChange={(e) => setFilterStage(e.target.value as LeadStage | "")} className="w-36 h-9">
          <option value="">All Stages</option>
          {(Object.keys(STAGE_CONFIG) as LeadStage[]).map((s) => (
            <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>
          ))}
        </Select>

        <Select value={filterSource} onChange={(e) => setFilterSource(e.target.value as LeadSource | "")} className="w-32 h-9">
          <option value="">All Sources</option>
          {(Object.keys(SOURCE_LABELS) as LeadSource[]).map((s) => (
            <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
          ))}
        </Select>

        <Select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} className="w-36 h-9">
          <option value="">All Owners</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.fullName}</option>
          ))}
        </Select>

        <div className="ml-auto">
          <Tabs value={view} onValueChange={(v) => setView(v as "kanban" | "list")}>
            <TabsList>
              <TabsTrigger value="kanban"><LayoutGrid className="h-3.5 w-3.5" /></TabsTrigger>
              <TabsTrigger value="list"><List className="h-3.5 w-3.5" /></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState icon={TrendingUp} title={search || filterStage || filterSource ? "No leads match your filters" : "No leads yet"}>
          {!search && !filterStage && !filterSource && (
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> New Lead</Button>
          )}
        </EmptyState>
      ) : view === "kanban" ? (
        <KanbanBoard
          leads={filtered}
          onLeadsChange={(updated) => setLeads((prev) => prev.map((l) => updated.find((u) => u.id === l.id) ?? l))}
          canEditLead={canEditLead}
          onEdit={openEdit}
          onDelete={(l) => setDeleting(l)}
        />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="hidden md:table-cell">Source</TableHead>
                <TableHead className="hidden lg:table-cell">Customer</TableHead>
                <TableHead className="hidden md:table-cell">Owner</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Est. Value</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => {
                const cfg = stageCfg(l.stage);
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium max-w-[180px] truncate">{l.title}</TableCell>
                    <TableCell>
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>
                        {cfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{SOURCE_LABELS[l.source]}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{l.customer?.name ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{l.owner.fullName}</TableCell>
                    <TableCell className="hidden sm:table-cell text-right font-mono text-sm">{formatSAR(Number(l.estimatedValue))}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(l.createdAt)}</TableCell>
                    <TableCell>
                      {canEditLead(l) && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(l)} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setDeleting(l)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <LeadFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={onSaved}
        initial={editing}
        customers={customers}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Lead"
        description={`Remove "${deleting?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
