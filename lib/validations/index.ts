import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Customer & Supplier (same shape) ─────────────────────────────────────────

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(191),
  contactPerson: z.string().max(191).optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  email: z.string().email("Invalid email").max(191).optional().or(z.literal("")),
  vatNumber: z.string().max(50).optional().or(z.literal("")),
  notes: z.string().optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

// ─── Lead ─────────────────────────────────────────────────────────────────────

export const leadStages = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;
export const leadSources = ["REFERRAL", "WEBSITE", "CALL", "WALK_IN", "OTHER"] as const;

export const leadSchema = z.object({
  title: z.string().min(1, "Title is required").max(191),
  customerId: z.string().optional().or(z.literal("")),
  contactName: z.string().max(191).optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  email: z.string().email("Invalid email").max(191).optional().or(z.literal("")),
  source: z.enum(leadSources, { errorMap: () => ({ message: "Select a source" }) }),
  stage: z.enum(leadStages).optional(),
  estimatedValue: z
    .string()
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, "Enter a valid amount"),
  notes: z.string().optional(),
  lostReason: z.string().optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const stageChangeSchema = z.object({
  stage: z.enum(leadStages),
  lostReason: z.string().optional(),
});

// ─── Deal ─────────────────────────────────────────────────────────────────────

const moneyField = (label: string) =>
  z
    .string()
    .refine((v) => v !== "" && !isNaN(parseFloat(v)) && parseFloat(v) >= 0, `${label} must be a valid amount`);

export const dealSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  supplierId: z.string().optional().or(z.literal("")),
  salespersonIds: z.array(z.string().min(1)).min(1, "Select at least one salesperson"),
  leadId: z.string().optional().or(z.literal("")),
  dealDate: z.string().min(1, "Deal date is required"),
  salesTotal: moneyField("Sales total"),
  purchaseTotal: moneyField("Purchase total"),
  transportation: z
    .string()
    .refine((v) => v === "" || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0), "Invalid amount")
    .optional(),
  vatRatePercent: z
    .string()
    .refine(
      (v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0 && parseFloat(v) <= 100,
      "VAT rate must be 0–100"
    ),
  notes: z.string().optional(),
});

export type DealInput = z.infer<typeof dealSchema>;

export const rejectSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required"),
});

// ─── Return ───────────────────────────────────────────────────────────────────

const money = (label: string) =>
  z.string().refine((v) => v !== "" && !isNaN(parseFloat(v)) && parseFloat(v) >= 0, `${label} must be a valid amount`);

export const returnSchema = z.object({
  dealId: z.string().min(1, "Deal is required"),
  returnDate: z.string().min(1, "Return date is required"),
  returnedSalesAmount: money("Returned sales amount"),
  costRecovered: money("Cost recovered"),
  returnCosts: z
    .string()
    .refine((v) => v === "" || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0), "Invalid amount")
    .optional(),
  reason: z.string().optional(),
});

export type ReturnInput = z.infer<typeof returnSchema>;

// ─── Settings: commission rules ───────────────────────────────────────────────

export const commissionRulesSchema = z
  .object({
    scheme: z.enum(["POOLED", "PER_DEAL"]),
    ownerPercent: z.number().min(0).max(100),
    salesPoolPercent: z.number().min(0).max(100),
    shares: z.record(z.string(), z.number().min(0).max(100)),
  })
  .refine(
    (d) => Math.round((d.ownerPercent + d.salesPoolPercent) * 100) / 100 === 100,
    { message: "Owner % + Sales pool % must equal 100", path: ["ownerPercent"] }
  )
  .refine(
    (d) => {
      if (d.scheme !== "POOLED") return true;
      const vals = Object.values(d.shares);
      if (vals.length === 0) return true;
      const sum = vals.reduce((a, b) => a + b, 0);
      return Math.round(sum * 100) / 100 === 100;
    },
    { message: "User shares must sum to 100%", path: ["shares"] }
  );

export type CommissionRulesInput = z.infer<typeof commissionRulesSchema>;

// ─── Settings: company info ───────────────────────────────────────────────────

export const companySchema = z.object({
  companyName: z.string().max(191).optional().or(z.literal("")),
  companyVatNumber: z.string().max(50).optional().or(z.literal("")),
  companyAddress: z.string().max(500).optional().or(z.literal("")),
  defaultVatRate: z.number().min(0).max(100),
});

export type CompanyInput = z.infer<typeof companySchema>;

// ─── User management ──────────────────────────────────────────────────────────

export const userCreateSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(191),
  email: z.string().email("Invalid email").max(191),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "USER"]),
  commissionSharePercent: z.number().min(0).max(100).nullable().optional(),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(191),
  email: z.string().email("Invalid email").max(191),
  role: z.enum(["ADMIN", "USER"]),
  commissionSharePercent: z.number().min(0).max(100).nullable().optional(),
  isActive: z.boolean(),
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// ─── Self-service: change my own password ─────────────────────────────────────

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
