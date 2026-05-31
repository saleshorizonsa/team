export type DealStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

export interface Deal {
  id: string;
  dealNumber: string;
  customerId: string;
  supplierId: string | null;
  salespersonId: string;
  leadId: string | null;
  salesTotal: string | number;
  purchaseTotal: string | number;
  transportation: string | number;
  vatRatePercent: string | number;
  vatAmount: string | number;
  profit: string | number;
  status: DealStatus;
  approvedById: string | null;
  approvedAt: Date | string | null;
  rejectReason: string | null;
  notes: string | null;
  dealDate: Date | string;
  createdById: string;
  createdAt: Date | string;
  customer: { id: string; name: string };
  supplier: { id: string; name: string } | null;
  salesperson: { id: string; fullName: string };
  createdBy: { id: string; fullName: string };
  lead: { id: string; title: string } | null;
}

export const STATUS_CONFIG: Record<
  DealStatus,
  { label: string; variant: "secondary" | "info" | "success" | "destructive" }
> = {
  DRAFT:     { label: "Draft",     variant: "secondary" },
  SUBMITTED: { label: "Submitted", variant: "info" },
  APPROVED:  { label: "Approved",  variant: "success" },
  REJECTED:  { label: "Rejected",  variant: "destructive" },
};

export interface CommissionRules {
  scheme: "POOLED" | "PER_DEAL";
  ownerPercent: number;
  salesPoolPercent: number;
  shares: Record<string, number>;
}
