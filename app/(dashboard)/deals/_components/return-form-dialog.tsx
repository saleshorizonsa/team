"use client";

import { useState, useEffect } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatSAR } from "@/lib/utils";
import type { Deal } from "./deal-types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  deal: Deal | null;
}

function num(v: string) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

export function ReturnFormDialog({ open, onClose, onSaved, deal }: Props) {
  const [returnDate, setReturnDate] = useState("");
  const [returnedSales, setReturnedSales] = useState("");
  const [costRecovered, setCostRecovered] = useState("");
  const [returnCosts, setReturnCosts] = useState("0");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setReturnDate(new Date().toISOString().slice(0, 10));
      setReturnedSales(""); setCostRecovered(""); setReturnCosts("0"); setReason(""); setError("");
    }
  }, [open]);

  if (!deal) return null;

  const reversedProfit = num(returnedSales) - num(costRecovered) + num(returnCosts);
  const grossProfit = Number(deal.profit);
  const currentNet = grossProfit - deal.returnedTotal;
  const newNet = currentNet - reversedProfit;

  async function submit() {
    setError("");
    if (!returnedSales) { setError("Returned sales amount is required"); return; }
    if (!costRecovered) { setError("Cost recovered is required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: deal!.id,
          returnDate,
          returnedSalesAmount: returnedSales,
          costRecovered,
          returnCosts: returnCosts || "0",
          reason,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to record return");
      const data = await res.json();
      toast.success(`Return ${data.returnNumber} recorded`);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Record Return — ${deal.dealNumber}`}
      description="VAT is not involved (the credit note lives in Zoho). The deal is never modified."
      className="max-w-lg"
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="returnDate">Return Date *</Label>
            <Input id="returnDate" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="returnedSales">Returned Sales Amount *</Label>
            <Input id="returnedSales" inputMode="decimal" value={returnedSales} onChange={(e) => setReturnedSales(e.target.value)} placeholder="0.00" className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="costRecovered">Cost Recovered (from supplier) *</Label>
            <Input id="costRecovered" inputMode="decimal" value={costRecovered} onChange={(e) => setCostRecovered(e.target.value)} placeholder="0.00" className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="returnCosts">Return Costs (you absorb)</Label>
            <Input id="returnCosts" inputMode="decimal" value={returnCosts} onChange={(e) => setReturnCosts(e.target.value)} placeholder="0.00" className="font-mono" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reason">Reason</Label>
          <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Why was this returned?" />
        </div>

        {/* Live preview */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Reversed profit (claws back)</span>
            <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">{formatSAR(reversedProfit)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Gross profit</span><span className="font-mono">{formatSAR(grossProfit)}</span>
          </div>
          <div className="flex items-center justify-between border-t pt-1.5">
            <span className="text-muted-foreground">Net profit after this return</span>
            <span className={cn("font-mono font-semibold", newNet >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
              {formatSAR(newNet)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            Pending commissions recompute on net profit; already-paid commissions get a negative clawback in the current period.
          </p>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Record Return
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
