"use client";

import { useState, useCallback } from "react";
import { Plus, Truck, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ContactFormDialog } from "@/app/(dashboard)/customers/_components/customer-form";
import { formatDate } from "@/lib/utils";

type Supplier = {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  vatNumber: string | null;
  notes: string | null;
  createdById: string;
  createdAt: Date | string;
  createdBy: { id: string; fullName: string };
};

interface Props {
  initialSuppliers: Supplier[];
  sessionUserId: string;
  isAdmin: boolean;
}

export function SuppliersClient({ initialSuppliers, sessionUserId, isAdmin }: Props) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.contactPerson?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  });

  const canEdit = useCallback(
    (s: Supplier) => isAdmin || s.createdById === sessionUserId,
    [isAdmin, sessionUserId]
  );

  function openCreate() { setEditing(null); setDialogOpen(true); }
  function openEdit(s: Supplier) { setEditing(s); setDialogOpen(true); }

  function onSaved(saved: Record<string, unknown>) {
    const s = saved as Supplier;
    setSuppliers((prev) => {
      const idx = prev.findIndex((x) => x.id === s.id);
      return idx >= 0 ? prev.map((x) => (x.id === s.id ? s : x)) : [s, ...prev];
    });
    setDialogOpen(false);
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuppliers((prev) => prev.filter((s) => s.id !== deleting.id));
      toast.success("Supplier deleted");
      setDeleting(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Suppliers" description={`${suppliers.length} total`}>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Supplier
        </Button>
      </PageHeader>

      <SearchInput value={search} onChange={setSearch} placeholder="Search suppliers…" className="max-w-sm" />

      {filtered.length === 0 ? (
        <EmptyState icon={Truck} title={search ? "No suppliers match" : "No suppliers yet"}>
          {!search && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> New Supplier
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">VAT No.</TableHead>
                <TableHead className="hidden md:table-cell">Added By</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.contactPerson ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{s.phone ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{s.email ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{s.vatNumber ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{s.createdBy.fullName}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">{formatDate(s.createdAt)}</TableCell>
                  <TableCell>
                    {canEdit(s) && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(s)} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeleting(s)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ContactFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={onSaved} initial={editing} entityType="supplier" />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} loading={deleteLoading} title="Delete Supplier" description={`Remove "${deleting?.name}"?`} confirmLabel="Delete" />
    </div>
  );
}
