import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getCommissionRules } from "@/lib/commission-service";
import { DEFAULT_VAT_RATE } from "@/lib/constants";
import { SettingsClient } from "./_components/settings-client";
import type { CompanyInput } from "@/lib/validations";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (session!.user.role !== "ADMIN") redirect("/");

  const [rules, users, companyRow] = await Promise.all([
    getCommissionRules(),
    db.user.findMany({
      select: {
        id: true, fullName: true, email: true, role: true,
        commissionSharePercent: true, isActive: true, createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    db.setting.findUnique({ where: { key: "company_info" } }),
  ]);

  const serializedUsers = users.map((u) => ({
    ...u,
    commissionSharePercent: u.commissionSharePercent != null ? Number(u.commissionSharePercent) : null,
  }));

  const company: CompanyInput =
    (companyRow?.value as unknown as CompanyInput) ?? {
      companyName: "",
      companyVatNumber: "",
      companyAddress: "",
      defaultVatRate: DEFAULT_VAT_RATE,
    };

  return (
    <SettingsClient
      initialRules={rules}
      initialUsers={serializedUsers}
      initialCompany={company}
      currentUserId={session!.user.id}
    />
  );
}
