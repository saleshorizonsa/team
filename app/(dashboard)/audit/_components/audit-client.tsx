"use client";

import { useState, useCallback } from "react";
import {
  Plus, Pencil, Trash2, CheckCircle2, XCircle, LogIn, Wallet, Settings as SettingsIcon, Loader2, Activity,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | "LOGIN" | "PAYOUT" | "SETTINGS_CHANGE";

interface Entry {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  userName: string;
  createdAt: Date | string;
}

const ACTION_META: Record<AuditAction, { icon: typeof Plus; tint: string; verb: string }> = {
  CREATE:          { icon: Plus,         tint: "text-green-600 bg-green-50 dark:bg-green-900/20",   verb: "created" },
  UPDATE:          { icon: Pencil,       tint: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",      verb: "updated" },
  DELETE:          { icon: Trash2,       tint: "text-red-600 bg-red-50 dark:bg-red-900/20",         verb: "deleted" },
  APPROVE:         { icon: CheckCircle2, tint: "text-green-600 bg-green-50 dark:bg-green-900/20",   verb: "approved" },
  REJECT:          { icon: XCircle,      tint: "text-red-600 bg-red-50 dark:bg-red-900/20",         verb: "rejected" },
  LOGIN:           { icon: LogIn,        tint: "text-slate-600 bg-slate-100 dark:bg-slate-800",     verb: "signed in" },
  PAYOUT:          { icon: Wallet,       tint: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",   verb: "paid out" },
  SETTINGS_CHANGE: { icon: SettingsIcon, tint: "text-purple-600 bg-purple-50 dark:bg-purple-900/20", verb: "changed settings" },
};

const ACTIONS = Object.keys(ACTION_META) as AuditAction[];

function timeAgo(d: Date | string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  initialEntries: Entry[];
  users: { id: string; fullName: string }[];
  isAdmin: boolean;
}

export function AuditClient({ initialEntries, users, isAdmin }: Props) {
  const [entries, setEntries] = useState(initialEntries);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  const applyFilters = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (action) params.set("action", action);
      if (entityType) params.set("entityType", entityType);
      if (userId) params.set("userId", userId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/audit?${params.toString()}`);
      if (res.ok) setEntries(await res.json());
    } finally {
      setLoading(false);
    }
  }, [action, entityType, userId, from, to]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={isAdmin ? "Audit Log" : "Activity"}
        description={isAdmin ? "Every action across the business" : "Recent activity across the team"}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </PageHeader>

      {isAdmin && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Action</label>
            <Select value={action} onChange={(e) => setAction(e.target.value)} className="h-9 w-40">
              <option value="">All actions</option>
              {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Entity</label>
            <Select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="h-9 w-36">
              <option value="">All entities</option>
              {["Deal", "Lead", "Customer", "Supplier", "Commission", "User", "Setting"].map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">User</label>
            <Select value={userId} onChange={(e) => setUserId(e.target.value)} className="h-9 w-40">
              <option value="">All users</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-36" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-36" />
          </div>
          <Button size="sm" onClick={applyFilters}>Apply</Button>
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState icon={Activity} title="No activity yet" />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm divide-y">
          {entries.map((e) => {
            const meta = ACTION_META[e.action];
            return (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <span className={cn("rounded-lg p-2 shrink-0", meta.tint)}>
                  <meta.icon className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{e.userName}</span>{" "}
                    <span className="text-muted-foreground">{meta.verb}</span>{" "}
                    <span className="font-medium">{e.entityType}</span>
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{e.entityId}</p>
                </div>
                <Badge variant="outline" className="shrink-0">{e.action}</Badge>
                <span className="text-xs text-muted-foreground shrink-0 w-20 text-right">{timeAgo(e.createdAt)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
