"use client";

import { useState } from "react";
import { Loader2, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "next-auth/react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  name: string;
  email: string;
  role: string;
}

export function AccountClient({ name, email, role }: Props) {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function save() {
    if (newPassword.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (newPassword !== confirm) { toast.error("New password and confirmation do not match"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not change password");
      toast.success("Password changed — please sign in again");
      setTimeout(() => signOut({ callbackUrl: "/login" }), 1200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change password");
    } finally {
      setLoading(false);
    }
  }

  const initials = name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="My Account" description="Your profile and security settings" />

      <Card>
        <CardContent className="flex items-center gap-4 py-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-lg font-semibold text-primary">
            {initials}
          </div>
          <div>
            <p className="text-base font-semibold">{name}</p>
            <p className="text-sm text-muted-foreground">{email}</p>
            <p className="mt-0.5 text-xs capitalize text-muted-foreground">{role.toLowerCase()}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Change Password</CardTitle>
          <CardDescription>You&apos;ll be signed out and asked to log in again after changing it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current">Current password</Label>
            <Input id="current" type={show ? "text" : "password"} autoComplete="current-password"
              value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new">New password</Label>
            <div className="relative">
              <Input id="new" type={show ? "text" : "password"} autoComplete="new-password"
                value={newPassword} onChange={(e) => setNew(e.target.value)} />
              <button type="button" onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={show ? "Hide passwords" : "Show passwords"}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input id="confirm" type={show ? "text" : "password"} autoComplete="new-password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <div className="flex justify-end border-t pt-4">
            <Button onClick={save} disabled={loading || !currentPassword || !newPassword || !confirm}>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
