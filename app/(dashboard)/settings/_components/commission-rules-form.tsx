"use client";

import { useMemo, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { cn, formatSAR } from "@/lib/utils";
import type { CommissionRules } from "@/lib/commission";
import type { ManagedUser } from "./settings-types";

interface PreviewRow { userId: string; fullName: string; before: number; after: number; }

interface Props {
  initialRules: CommissionRules;
  users: ManagedUser[];
}

export function CommissionRulesForm({ initialRules, users }: Props) {
  const salesUsers = users.filter((u) => u.role === "USER");

  const [scheme, setScheme] = useState<CommissionRules["scheme"]>(initialRules.scheme);
  const [ownerPercent, setOwnerPercent] = useState<number>(initialRules.ownerPercent);
  const [salesPoolPercent, setSalesPoolPercent] = useState<number>(initialRules.salesPoolPercent);
  const [shares, setShares] = useState<Record<string, number>>(() => {
    const s: Record<string, number> = {};
    for (const u of salesUsers) {
      s[u.id] = initialRules.shares[u.id] ?? u.commissionSharePercent ?? 0;
    }
    return s;
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [affectedDeals, setAffectedDeals] = useState(0);
  const [loading, setLoading] = useState(false);

  // ── validation ──
  const splitTotal = Math.round((ownerPercent + salesPoolPercent) * 100) / 100;
  const splitValid = splitTotal === 100;
  const shareTotal = Math.round(Object.values(shares).reduce((a, b) => a + b, 0) * 100) / 100;
  const sharesValid = scheme !== "POOLED" || salesUsers.length === 0 || shareTotal === 100;
  const canPreview = splitValid && sharesValid;

  function buildRules(): CommissionRules {
    return { scheme, ownerPercent, salesPoolPercent, shares };
  }

  function setOwner(v: number) {
    setOwnerPercent(v);
    setSalesPoolPercent(Math.round((100 - v) * 100) / 100);
  }

  async function openPreview() {
    if (!canPreview) return;
    setLoading(true);
    try {
      const res = await fetch("/api/settings/commission-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: false, rules: buildRules() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Preview failed");
      const data = await res.json();
      setPreviewRows(data.rows);
      setAffectedDeals(data.affectedDeals);
      setPreviewOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  }

  async function applyChanges() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/commission-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true, rules: buildRules() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      const data = await res.json();
      toast.success(`Saved — recomputed ${data.affectedDeals} deal(s) of pending commissions`);
      setPreviewOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  const eachUserOfProfit = useMemo(() => {
    // For display: effective % of profit each user gets under POOLED
    const total = shareTotal || 1;
    const map: Record<string, number> = {};
    for (const u of salesUsers) {
      map[u.id] = scheme === "POOLED"
        ? (salesPoolPercent * (shares[u.id] ?? 0)) / total
        : 0;
    }
    return map;
  }, [salesUsers, scheme, salesPoolPercent, shares, shareTotal]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Update Share Percentage</CardTitle>
        <CardDescription>
          Configure how each deal&apos;s profit is split. Saving recomputes all <strong>pending</strong> commissions;
          paid commissions are never changed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scheme */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="scheme">Scheme</Label>
            <Select id="scheme" value={scheme} onChange={(e) => setScheme(e.target.value as CommissionRules["scheme"])}>
              <option value="POOLED">Pooled</option>
              <option value="PER_DEAL">Per-Deal</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="owner">Owner %</Label>
            <Input
              id="owner" type="number" inputMode="decimal" min={0} max={100}
              value={ownerPercent}
              onChange={(e) => setOwner(parseFloat(e.target.value) || 0)}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pool">Sales Pool %</Label>
            <Input
              id="pool" type="number" inputMode="decimal" min={0} max={100}
              value={salesPoolPercent}
              onChange={(e) => setSalesPoolPercent(parseFloat(e.target.value) || 0)}
              className="font-mono"
            />
          </div>
        </div>

        {/* Split validity */}
        <div className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
          splitValid ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                     : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
        )}>
          {splitValid ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          Owner % + Sales Pool % = <strong>{splitTotal}%</strong>
          {!splitValid && " (must equal 100%)"}
        </div>

        {/* Scheme explanation */}
        <p className="text-xs text-muted-foreground">
          {scheme === "POOLED"
            ? "Pooled: the owner takes the owner %; the sales pool % is split among users by their shares below."
            : "Per-Deal: the owner takes the owner %; the credited salesperson takes the full sales pool % of that deal."}
        </p>

        {/* User shares (POOLED) */}
        {scheme === "POOLED" && salesUsers.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>User Shares (of the sales pool)</Label>
              <span className={cn(
                "text-xs font-medium",
                sharesValid ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
              )}>
                Total: {shareTotal}% {!sharesValid && "(must be 100%)"}
              </span>
            </div>
            <div className="space-y-2">
              {salesUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{u.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      ≈ {eachUserOfProfit[u.id]?.toFixed(1)}% of each deal&apos;s profit
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number" inputMode="decimal" min={0} max={100}
                      value={shares[u.id] ?? 0}
                      onChange={(e) => setShares((s) => ({ ...s, [u.id]: parseFloat(e.target.value) || 0 }))}
                      className="w-24 font-mono text-right"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button onClick={openPreview} disabled={!canPreview || loading}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Preview Changes
          </Button>
        </div>
      </CardContent>

      {/* Preview / confirm dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Review Commission Changes"
        description={`This will recompute pending commissions across ${affectedDeals} deal(s). Paid commissions stay unchanged.`}
        className="max-w-lg"
      >
        <div className="space-y-4">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">User</th>
                  <th className="px-3 py-2 text-right font-medium">Before</th>
                  <th className="px-3 py-2 text-right font-medium"></th>
                  <th className="px-3 py-2 text-right font-medium">After</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">No pending commissions to recompute.</td></tr>
                ) : previewRows.map((r) => {
                  const changed = Math.abs(r.after - r.before) > 0.005;
                  return (
                    <tr key={r.userId} className="border-t">
                      <td className="px-3 py-2">{r.fullName}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatSAR(r.before)}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground"><ArrowRight className="h-3 w-3 inline" /></td>
                      <td className={cn("px-3 py-2 text-right font-mono font-medium", changed && "text-primary")}>{formatSAR(r.after)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            This action is logged and cannot be undone automatically.
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)} disabled={loading}>Cancel</Button>
            <Button onClick={applyChanges} disabled={loading}>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm &amp; Apply
            </Button>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}
