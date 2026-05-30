export const APP_NAME = "Team Trading";
export const APP_DESCRIPTION = "Commission Tracker — Real-time deal and commission visibility";

export const CURRENCY = "SAR";
export const DEFAULT_VAT_RATE = 15;

export const DEAL_NUMBER_PREFIX = "D";

export const COMMISSION_DEFAULTS = {
  scheme: "POOLED" as const,
  ownerPercent: 25,
  salesPoolPercent: 75,
};

export const ROLES = {
  ADMIN: "ADMIN",
  USER: "USER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
