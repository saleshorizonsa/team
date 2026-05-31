export interface ManagedUser {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "USER";
  commissionSharePercent: number | null;
  isActive: boolean;
  createdAt: Date | string;
}
