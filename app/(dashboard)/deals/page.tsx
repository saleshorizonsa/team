import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DealsClient } from "./_components/deals-client";
import type { CommissionRules, CommissionParticipant } from "@/lib/commission";
import { DEFAULT_VAT_RATE, COMMISSION_DEFAULTS } from "@/lib/constants";

export const metadata = { title: "Deals" };

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; customerId?: string; salespersonId?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;

  const [deals, customers, suppliers, users, settingRow] = await Promise.all([
    db.deal.findMany({
      where: { deletedAt: null },
      include: {
        customer: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        salesperson: { select: { id: true, fullName: true } },
        createdBy: { select: { id: true, fullName: true } },
        lead: { select: { id: true, title: true } },
        returns: { select: { reversedProfit: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.customer.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.supplier.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { isActive: true }, select: { id: true, fullName: true, role: true }, orderBy: { fullName: "asc" } }),
    db.setting.findUnique({ where: { key: "commission_rules" } }),
  ]);

  const rules: CommissionRules =
    (settingRow?.value as unknown as CommissionRules) ?? {
      scheme: COMMISSION_DEFAULTS.scheme,
      ownerPercent: COMMISSION_DEFAULTS.ownerPercent,
      salesPoolPercent: COMMISSION_DEFAULTS.salesPoolPercent,
      shares: {},
    };

  const participants: CommissionParticipant[] = users.map((u) => ({
    userId: u.id,
    fullName: u.fullName,
    role: u.role,
  }));

  const prefill = sp.leadId
    ? { leadId: sp.leadId, customerId: sp.customerId, salespersonId: sp.salespersonId }
    : null;

  // Prisma Decimal isn't serializable across the RSC boundary — convert to numbers.
  const serializedDeals = deals.map(({ returns, ...d }) => ({
    ...d,
    salesTotal: Number(d.salesTotal),
    purchaseTotal: Number(d.purchaseTotal),
    transportation: Number(d.transportation),
    vatRatePercent: Number(d.vatRatePercent),
    vatAmount: Number(d.vatAmount),
    profit: Number(d.profit),
    creditedUserIds: Array.isArray(d.creditedUserIds) ? (d.creditedUserIds as string[]) : null,
    returnedTotal: returns.reduce((s, r) => s + Number(r.reversedProfit), 0),
  }));

  return (
    <DealsClient
      initialDeals={serializedDeals}
      customers={customers}
      suppliers={suppliers}
      users={users.map((u) => ({ id: u.id, fullName: u.fullName }))}
      rules={rules}
      participants={participants}
      defaultVatRate={DEFAULT_VAT_RATE}
      sessionUserId={session!.user.id}
      isAdmin={session!.user.role === "ADMIN"}
      initialPrefill={prefill}
      openFormOnLoad={!!prefill}
    />
  );
}
