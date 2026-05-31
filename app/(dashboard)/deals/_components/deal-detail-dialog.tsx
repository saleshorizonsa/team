"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./status-badge";
import { formatSAR, formatDate, cn } from "@/lib/utils";
import type { Deal } from "./deal-types";

interface ReturnRow {
  id: string;
  returnNumber: string;
  returnDate: string;
  reversedProfit: number;
  reason: string | null;
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(mono && "font-mono")}>{value}</span>
    </div>
  );
}

export function DealDetailDialog({ open, onClose, deal }: { open: boolean; onClose: () => void; deal: Deal | null }) {
  const [returns, setReturns] = useState<ReturnRow[]>([]);

  useEffect(() => {
    if (open && deal && deal.returnedTotal > 0) {
      fetch(`/api/returns?dealId=${deal.id}`)
        .then((r) => (r.ok ? r.json() : []))
        .then(setReturns)
        .catch(() => setReturns([]));
    } else {
      setReturns([]);
    }
  }, [open, deal]);

  if (!deal) return null;
  const profit = Number(deal.profit);
  const net = profit - (deal.returnedTotal ?? 0);
  const hasReturns = (deal.returnedTotal ?? 0) > 0;

  return (
    <Dialog open={open} onClose={onClose} title={`Deal ${deal.dealNumber}`} className="max-w-lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <StatusBadge status={deal.status} />
          {deal.lead && <Badge variant="purple">From Lead</Badge>}
        </div>

        <div className="rounded-lg border divide-y">
          <div className="px-4 py-1">
            <Row label="Customer" value={deal.customer.name} />
            <Row label="Supplier" value={deal.supplier?.name ?? "—"} />
            <Row label="Salesperson" value={deal.salesperson.fullName} />
            <Row label="Deal Date" value={formatDate(deal.dealDate)} />
          </div>
          <div className="px-4 py-1">
            <Row label="Sales Total" value={formatSAR(Number(deal.salesTotal))} mono />
            <Row label="Purchase Total" value={formatSAR(Number(deal.purchaseTotal))} mono />
            <Row label="Transportation" value={formatSAR(Number(deal.transportation))} mono />
            <div className="flex items-center justify-between py-1.5 text-sm font-semibold border-t mt-1">
              <span className={hasReturns ? "text-muted-foreground" : (profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                {hasReturns ? "Gross Profit" : "Profit"}
              </span>
              <span className={cn("font-mono", hasReturns ? "text-muted-foreground" : (profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"))}>
                {formatSAR(profit)}
              </span>
            </div>
            {hasReturns && (
              <>
                <Row label="Less: Returns" value={`− ${formatSAR(deal.returnedTotal)}`} mono />
                <div className="flex items-center justify-between py-1.5 text-sm font-semibold">
                  <span className={net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>Net Profit</span>
                  <span className={cn("font-mono", net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>{formatSAR(net)}</span>
                </div>
              </>
            )}
            <Row label={`VAT (${Number(deal.vatRatePercent)}%)`} value={formatSAR(Number(deal.vatAmount))} mono />
          </div>
        </div>

        {hasReturns && (
          <div className="rounded-lg border">
            <div className="border-b bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
              Returns ({returns.length})
            </div>
            <div className="divide-y">
              {returns.map((r) => (
                <div key={r.id} className="flex items-start justify-between px-3 py-2 text-sm">
                  <div>
                    <span className="font-mono text-xs">{r.returnNumber}</span>
                    <span className="text-muted-foreground"> · {formatDate(r.returnDate)}</span>
                    {r.reason && <p className="text-xs text-muted-foreground mt-0.5">{r.reason}</p>}
                  </div>
                  <span className="font-mono text-amber-600 dark:text-amber-400">− {formatSAR(r.reversedProfit)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {deal.rejectReason && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
            <p className="text-xs font-medium text-destructive">Rejection Reason</p>
            <p className="text-sm text-destructive/90 mt-0.5">{deal.rejectReason}</p>
          </div>
        )}

        {deal.notes && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Notes</p>
            <p className="text-sm mt-0.5">{deal.notes}</p>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          Created by {deal.createdBy.fullName} · {formatDate(deal.createdAt)}
          {deal.approvedAt && ` · Approved ${formatDate(deal.approvedAt)}`}
        </p>
      </div>
    </Dialog>
  );
}
