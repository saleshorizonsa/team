"use client";

import { useEffect, useState } from "react";
import { Loader2, Plug, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Status {
  configured: boolean;
  connected: boolean;
  organizationId: string | null;
  apiDomain: string | null;
  connectedAt: string | null;
}

export function ZohoSettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/zoho/status");
      if (res.ok) setStatus(await res.json());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // surface the OAuth callback result (?zoho=connected|error)
    const p = new URLSearchParams(window.location.search).get("zoho");
    if (p === "connected") toast.success("Zoho Books connected");
    else if (p && p !== "connected") toast.error(`Zoho connection failed (${p})`);
  }, []);

  async function disconnect() {
    setBusy(true);
    try {
      const res = await fetch("/api/zoho/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("Disconnect failed");
      toast.success("Disconnected from Zoho Books");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Plug className="h-4 w-4" /> Zoho Books</CardTitle>
        <CardDescription>
          Connect read-only to import selected invoices as deals. The team never sees Zoho —
          only the deals you import. Tokens are encrypted; the data center is auto-detected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : !status?.configured ? (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              Zoho is not configured. Set <code>ZOHO_CLIENT_ID</code>, <code>ZOHO_CLIENT_SECRET</code>,
              <code> ZOHO_REDIRECT_URI</code> and <code>ENCRYPTION_KEY</code> in the server environment, then redeploy.
            </div>
          </div>
        ) : status.connected ? (
          <>
            <div className="flex items-center gap-2">
              <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1 inline" /> Connected</Badge>
              {status.apiDomain && <span className="text-xs text-muted-foreground">{status.apiDomain}</span>}
            </div>
            <div className="text-sm text-muted-foreground space-y-0.5">
              <p>Organization ID: <span className="font-mono">{status.organizationId ?? "—"}</span></p>
              {status.connectedAt && <p>Connected {new Date(status.connectedAt).toLocaleString("en-GB")}</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { window.location.href = "/api/zoho/connect"; }}>
                Reconnect
              </Button>
              <Button variant="destructive" size="sm" onClick={disconnect} disabled={busy}>
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Disconnect
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Not connected.</p>
            <Button onClick={() => { window.location.href = "/api/zoho/connect"; }}>
              <Plug className="h-4 w-4" /> Connect Zoho Books
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
