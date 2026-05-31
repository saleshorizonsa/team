"use client";

import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./status-badge";
import { formatSAR, formatDate, cn } from "@/lib/utils";
import type { Deal } from "./deal-types";

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(mono && "font-mono")}>{value}</span>
    </div>
  );
}

export function DealDetailDialog({ open, onClose, deal }: { open: boolean; onClose: () => void; deal: Deal | null }) {
  if (!deal) return null;
  const profit = Number(deal.profit);

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
              <span className={profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>Profit</span>
              <span className={cn("font-mono", profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                {formatSAR(profit)}
              </span>
            </div>
            <Row label={`VAT (${Number(deal.vatRatePercent)}%)`} value={formatSAR(Number(deal.vatAmount))} mono />
          </div>
        </div>

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
