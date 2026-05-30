export type LeadStage = "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";
export type LeadSource = "REFERRAL" | "WEBSITE" | "CALL" | "WALK_IN" | "OTHER";

export interface Lead {
  id: string;
  title: string;
  customerId: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  source: LeadSource;
  stage: LeadStage;
  estimatedValue: string | number;
  ownerId: string;
  notes: string | null;
  lostReason: string | null;
  convertedDealId: string | null;
  createdAt: Date | string;
  owner: { id: string; fullName: string };
  customer: { id: string; name: string } | null;
}

export const STAGE_ORDER: LeadStage[] = [
  "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST",
];

export const STAGE_CONFIG: Record<LeadStage, { label: string; color: string; bg: string }> = {
  NEW:         { label: "New",         color: "text-slate-600 dark:text-slate-400",   bg: "bg-slate-100 dark:bg-slate-800" },
  CONTACTED:   { label: "Contacted",   color: "text-blue-600 dark:text-blue-400",     bg: "bg-blue-50 dark:bg-blue-900/20" },
  QUALIFIED:   { label: "Qualified",   color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
  PROPOSAL:    { label: "Proposal",    color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/20" },
  NEGOTIATION: { label: "Negotiation", color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-900/20" },
  WON:         { label: "Won",         color: "text-green-600 dark:text-green-400",   bg: "bg-green-50 dark:bg-green-900/20" },
  LOST:        { label: "Lost",        color: "text-red-600 dark:text-red-400",       bg: "bg-red-50 dark:bg-red-900/20" },
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  REFERRAL: "Referral",
  WEBSITE:  "Website",
  CALL:     "Cold Call",
  WALK_IN:  "Walk-in",
  OTHER:    "Other",
};
