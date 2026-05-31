"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Handshake, Plug } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatSAR, formatDate, cn } from "@/lib/utils";
import type { CommissionRules, CommissionParticipant } from "@/lib/commission";
import { DealFormDialog, type DealFormPrefill } from "./deal-form-dialog";
import { DealActions } from "./deal-actions";
import { DealDetailDialog } from "./deal-detail-dialog";
import { RejectDialog } from "./reject-dialog";
import { ReturnFormDialog } from "./return-form-dialog";
import { ZohoImportDialog } from "./zoho-import-dialog";
import { StatusBadge } from "./status-badge";
import { STATUS_CONFIG, type Deal, type DealStatus } from "./deal-types";

interface Props {
  initialDeals: Deal[];
  customers: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  users: { id: string; fullName: string }[];
  rules: CommissionRules;
  participants: CommissionParticipant[];
  defaultVatRate: number;
  sessionUserId: string;
  isAdmin: boolean;
  /** optional prefill (used when arriving from a lead conversion) */
  initialPrefill?: DealFormPrefill | null;
  openFormOnLoad?: boolean;
}

export function DealsClient({
  initialDeals, customers, suppliers, users, rules, participants, defaultVatRate,
  sessionUserId, isAdmin, initialPrefill, openFormOnLoad,
}: Props) {
  const [deals, setDeals] = useState(initialDeals);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<DealStatus | "">("");
  const [filterSalesperson, setFilterSalesperson] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const [formOpen, setFormOpen] = useState(!!openFormOnLoad);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [prefill, setPrefill] = useState<DealFormPrefill | null>(initialPrefill ?? null);
  const [viewing, setViewing] = useState<Deal | null>(null);
  const [deleting, setDeleting] = useState<Deal | null>(null);
  const [rejecting, setRejecting] = useState<Deal | null>(null);
  const [returning, setReturning] = useState<Deal | null>(null);
  const [zohoOpen, setZohoOpen] = useState(false);
  const [busyLoading, setBusyLoading] = useState(false);
  const router = useRouter();

  const upsert = useCallback((saved: Deal) => {
    setDeals((prev) => {
      const idx = prev.findIndex((d) => d.id === saved.id);
      return idx >= 0 ? prev.map((d) => (d.id === saved.id ? saved : d)) : [saved, ...prev];
    });
  }, []);

  // ── filters ──
  const filtered = useMemo(() => {
    return deals.filter((d) => {
      const q = search.toLowerCase();
      if (q && !d.dealNumber.toLowerCase().includes(q) &&
          !d.customer.name.toLowerCase().includes(q) &&
          !d.salesperson.fullName.toLowerCase().includes(q)) return false;
      if (filterStatus && d.status !== filterStatus) return false;
      if (filterSalesperson && d.salespersonId !== filterSalesperson) return false;
      if (filterFrom && new Date(d.dealDate) < new Date(filterFrom)) return false;
      if (filterTo && new Date(d.dealDate) > new Date(filterTo)) return false;
      return true;
    });
  }, [deals, search, filterStatus, filterSalesperson, filterFrom, filterTo]);

  // ── status transition actions ──
  async function doTransition(deal: Deal, path: string, body?: object, successMsg?: string) {
    try {
      const res = await fetch(`/api/deals/${deal.id}/${path}`, {
        method: "PATCH",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Action failed");
      const updated = await res.json();
      upsert(updated);
      if (successMsg) toast.success(successMsg);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
      return false;
    }
  }

  const onSubmitDeal = (d: Deal) => doTransition(d, "submit", undefined, `${d.dealNumber} submitted for approval`);
  const onApproveDeal = (d: Deal) => doTransition(d, "approve", undefined, `${d.dealNumber} approved`);

  async function handleReject(reason: string) {
    if (!rejecting) return;
    const ok = await doTransition(rejecting, "reject", { reason }, `${rejecting.dealNumber} rejected`);
    if (ok) setRejecting(null);
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusyLoading(true);
    try {
      const res = await fetch(`/api/deals/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setDeals((prev) => prev.filter((d) => d.id !== deleting.id));
      toast.success("Deal deleted");
      setDeleting(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyLoading(false);
    }
  }

  function openCreate() { setEditing(null); setPrefill(null); setFormOpen(true); }
  function openEdit(d: Deal) { setEditing(d); setPrefill(null); setFormOpen(true); }

  // ── columns ──
  const columns = useMemo<ColumnDef<Deal, unknown>[]>(() => [
    {
      accessorKey: "dealNumber",
      header: "Deal #",
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.dealNumber}</span>,
    },
    {
      id: "customer",
      header: "Customer",
      accessorFn: (d) => d.customer.name,
      cell: ({ row }) => <span className="font-medium">{row.original.customer.name}</span>,
    },
    {
      id: "salesperson",
      header: "Salesperson",
      accessorFn: (d) => d.salesperson.fullName,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.salesperson.fullName}</span>,
    },
    {
      accessorKey: "salesTotal",
      header: "Sales",
      cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{formatSAR(Number(row.original.salesTotal))}</span>,
    },
    {
      accessorKey: "profit",
      header: "Profit",
      cell: ({ row }) => {
        const gross = Number(row.original.profit);
        const returned = row.original.returnedTotal ?? 0;
        const net = gross - returned;
        const color = (v: number) => v >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
        if (returned > 0) {
          return (
            <div className="leading-tight">
              <div className={cn("font-mono text-sm tabular-nums font-medium", color(net))}>{formatSAR(net)}</div>
              <div className="font-mono text-[10px] text-muted-foreground line-through">{formatSAR(gross)}</div>
            </div>
          );
        }
        return <span className={cn("font-mono text-sm tabular-nums font-medium", color(gross))}>{formatSAR(gross)}</span>;
      },
    },
    {
      accessorKey: "dealDate",
      header: "Date",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.dealDate)}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <DealActions
          deal={row.original}
          isAdmin={isAdmin}
          sessionUserId={sessionUserId}
          onEdit={openEdit}
          onView={setViewing}
          onDelete={setDeleting}
          onSubmit={onSubmitDeal}
          onApprove={onApproveDeal}
          onReject={setRejecting}
          onReturn={setReturning}
        />
      ),
    },
  ], [isAdmin, sessionUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = !!(search || filterStatus || filterSalesperson || filterFrom || filterTo);

  return (
    <div className="space-y-5">
      <PageHeader title="Deals" description={`${deals.length} total`}>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={() => setZohoOpen(true)}>
            <Plug className="h-4 w-4" /> Import from Zoho
          </Button>
        )}
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Deal
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search deal #, customer…" className="w-52" />
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as DealStatus | "")} className="w-36 h-9">
          <option value="">All Statuses</option>
          {(Object.keys(STATUS_CONFIG) as DealStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </Select>
        <Select value={filterSalesperson} onChange={(e) => setFilterSalesperson(e.target.value)} className="w-40 h-9">
          <option value="">All Salespeople</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
        </Select>
        <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="w-36 h-9" title="From date" />
        <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="w-36 h-9" title="To date" />
      </div>

      {/* Table / empty */}
      {deals.length === 0 ? (
        <EmptyState icon={Handshake} title="No deals yet" description="Create your first deal to get started.">
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> New Deal</Button>
        </EmptyState>
      ) : filtered.length === 0 && hasFilters ? (
        <EmptyState icon={Handshake} title="No deals match your filters" />
      ) : (
        <DataTable data={filtered} columns={columns} pageSize={20} />
      )}

      {/* Dialogs */}
      <DealFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(d) => { upsert(d); setFormOpen(false); }}
        initial={editing}
        prefill={prefill}
        customers={customers}
        suppliers={suppliers}
        users={users}
        rules={rules}
        participants={participants}
        defaultVatRate={defaultVatRate}
      />

      <DealDetailDialog open={!!viewing} onClose={() => setViewing(null)} deal={viewing} />

      <RejectDialog
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        onConfirm={handleReject}
        dealNumber={rejecting?.dealNumber}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={busyLoading}
        title="Delete Deal"
        description={`Remove ${deleting?.dealNumber}? This cannot be undone.`}
        confirmLabel="Delete"
      />

      <ReturnFormDialog
        open={!!returning}
        onClose={() => setReturning(null)}
        deal={returning}
        onSaved={() => { setReturning(null); router.refresh(); }}
      />

      {isAdmin && (
        <ZohoImportDialog
          open={zohoOpen}
          onClose={() => setZohoOpen(false)}
          users={users}
          onImported={() => { setZohoOpen(false); router.refresh(); }}
        />
      )}
    </div>
  );
}
