"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { ManagedUser } from "./settings-types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (user: ManagedUser) => void;
  initial?: ManagedUser | null;
}

export function UserFormDialog({ open, onClose, onSaved, initial }: Props) {
  const isEdit = !!initial;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [share, setShare] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setFullName(initial?.fullName ?? "");
      setEmail(initial?.email ?? "");
      setPassword("");
      setRole(initial?.role ?? "USER");
      setShare(initial?.commissionSharePercent != null ? String(initial.commissionSharePercent) : "");
      setIsActive(initial?.isActive ?? true);
      setError("");
    }
  }, [open, initial]);

  async function save() {
    setError("");
    if (!fullName.trim()) { setError("Full name is required"); return; }
    if (!isEdit && !/^[^@]+@[^@]+\.[^@]+$/.test(email)) { setError("Valid email required"); return; }
    if (!isEdit && password.length < 8) { setError("Password must be at least 8 characters"); return; }

    const shareVal = share === "" ? null : parseFloat(share);

    setLoading(true);
    try {
      const url = isEdit ? `/api/users/${initial!.id}` : "/api/users";
      const payload = isEdit
        ? { fullName, role, commissionSharePercent: shareVal, isActive }
        : { fullName, email, password, role, commissionSharePercent: shareVal };
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      const saved = await res.json();
      toast.success(isEdit ? "User updated" : "User created");
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? "Edit User" : "New User"} className="max-w-md">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" value={email} disabled={isEdit}
            onChange={(e) => setEmail(e.target.value)}
            className={isEdit ? "opacity-60" : ""} />
          {isEdit && <p className="text-[11px] text-muted-foreground">Email cannot be changed.</p>}
        </div>

        {!isEdit && (
          <div className="space-y-1.5">
            <Label htmlFor="password">Temporary Password *</Label>
            <Input id="password" type="text" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <Select id="role" value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "USER")}>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="share">Share %</Label>
            <Input id="share" type="number" inputMode="decimal" min={0} max={100} value={share}
              onChange={(e) => setShare(e.target.value)} placeholder="—" className="font-mono" />
          </div>
        </div>

        {isEdit && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-input" />
            Active
          </label>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={save} disabled={loading}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "Save Changes" : "Create User"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
