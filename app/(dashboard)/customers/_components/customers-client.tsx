"use client";

import { useState, useCallback } from "react";
import { Plus, Users, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ContactFormDialog } from "./customer-form";
import { formatDate } from "@/lib/utils";

type Customer = {
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
  initialCustomers: Customer[];
  sessionUserId: string;
  isAdmin: boolean;
}

export function CustomersClient({ initialCustomers, sessionUserId, isAdmin }: Props) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.contactPerson?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  });

  const canEdit = useCallback(
    (c: Customer) => isAdmin || c.createdById === sessionUserId,
    [isAdmin, sessionUserId]
  );

  function openCreate() { setEditing(null); setDialogOpen(true); }
  function openEdit(c: Customer) { setEditing(c); setDialogOpen(true); }

  function onSaved(saved: Customer) {
    setCustomers((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      return idx >= 0
        ? prev.map((c) => (c.id === saved.id ? saved : c))
        : [saved, ...prev];
    });
    setDialogOpen(false);
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/customers/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setCustomers((prev) => prev.filter((c) => c.id !== deleting.id));
      toast.success("Customer deleted");
      setDeleting(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        description={`${customers.length} total`}
      >
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Customer
        </Button>
      </PageHeader>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by name, contact, email…"
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "No customers match your search" : "No customers yet"}
          description={!search ? "Add your first customer to get started." : undefined}
        >
          {!search && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> New Customer
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
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.contactPerson ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{c.phone ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{c.email ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{c.vatNumber ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                    {c.createdBy.fullName}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                    {formatDate(c.createdAt)}
                  </TableCell>
                  <TableCell>
                    {canEdit(c) && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleting(c)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ContactFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={onSaved}
        initial={editing}
        entityType="customer"
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Customer"
        description={`Remove "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
