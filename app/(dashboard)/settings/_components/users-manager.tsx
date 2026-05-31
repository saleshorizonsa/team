"use client";

import { useState } from "react";
import { Plus, Pencil, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { UserFormDialog } from "./user-form-dialog";
import type { ManagedUser } from "./settings-types";

interface Props {
  initialUsers: ManagedUser[];
  onUsersChange: (users: ManagedUser[]) => void;
  currentUserId: string;
}

export function UsersManager({ initialUsers, onUsersChange, currentUserId }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [resetting, setResetting] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  function sync(next: ManagedUser[]) {
    setUsers(next);
    onUsersChange(next);
  }

  function onSaved(saved: ManagedUser) {
    const idx = users.findIndex((u) => u.id === saved.id);
    const next = idx >= 0 ? users.map((u) => (u.id === saved.id ? saved : u)) : [...users, saved];
    sync(next);
    setFormOpen(false);
  }

  async function doReset() {
    if (!resetting) return;
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setResetLoading(true);
    try {
      const res = await fetch(`/api/users/${resetting.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Reset failed");
      toast.success(`Password reset for ${resetting.fullName}`);
      setResetting(null);
      setNewPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Users</CardTitle>
          <CardDescription>Create users, set roles &amp; shares, reset passwords, deactivate.</CardDescription>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> New User
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Share %</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.fullName}
                    {u.id === currentUserId && <span className="ml-1.5 text-[10px] text-muted-foreground">(you)</span>}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "ADMIN" ? "purple" : "secondary"}>{u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {u.commissionSharePercent != null ? `${u.commissionSharePercent}%` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "success" : "secondary"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditing(u); setFormOpen(true); }}
                        className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => { setResetting(u); setNewPassword(""); }}
                        className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="Reset password">
                        <KeyRound className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <UserFormDialog open={formOpen} onClose={() => setFormOpen(false)} onSaved={onSaved} initial={editing} />

      <Dialog open={!!resetting} onClose={() => setResetting(null)} title="Reset Password"
        description={resetting ? `Set a new password for ${resetting.fullName}.` : undefined} className="max-w-sm">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setResetting(null)} disabled={resetLoading}>Cancel</Button>
            <Button onClick={doReset} disabled={resetLoading}>
              {resetLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Reset Password
            </Button>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}
