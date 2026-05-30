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
