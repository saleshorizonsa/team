import { db } from "@/lib/db";
import { periodOf } from "@/lib/commission-service";
import type { Prisma } from "@prisma/client";

export interface DashboardFilters {
  from?: string;
  to?: string;
  salespersonId?: string;
}

export interface DashboardData {
  kpis: {
    totalSales: number;
    totalProfit: number;
    totalVat: number;
    dealCount: number;
    totalCommissions: number;
    pendingPayouts: number;
    myCommission: number;
  };
  profitOverTime: { period: string; sales: number; profit: number }[];
  dealsByStatus: { status: string; count: number }[];
  commissionByPerson: { userId: string; name: string; amount: number; isMe: boolean }[];
}

export async function computeDashboard(
  filters: DashboardFilters,
  sessionUserId: string
): Promise<DashboardData> {
  const dateFilter: Prisma.DateTimeFilter = {};
  if (filters.from) dateFilter.gte = new Date(filters.from);
  if (filters.to) dateFilter.lte = new Date(filters.to);
  const hasDate = !!(filters.from || filters.to);

  const baseWhere: Prisma.DealWhereInput = {
    deletedAt: null,
    ...(hasDate ? { dealDate: dateFilter } : {}),
    ...(filters.salespersonId ? { salespersonId: filters.salespersonId } : {}),
  };

  // Approved deals drive the financial KPIs
  const approved = await db.deal.findMany({
    where: { ...baseWhere, status: "APPROVED" },
    select: { id: true, salesTotal: true, profit: true, vatAmount: true, dealDate: true },
  });

  let totalSales = 0, totalProfit = 0, totalVat = 0;
  const monthMap = new Map<string, { sales: number; profit: number }>();
  for (const d of approved) {
    const s = Number(d.salesTotal), p = Number(d.profit), v = Number(d.vatAmount);
    totalSales += s; totalProfit += p; totalVat += v;
    const per = periodOf(new Date(d.dealDate));
    const m = monthMap.get(per) ?? { sales: 0, profit: 0 };
    m.sales += s; m.profit += p;
    monthMap.set(per, m);
  }
  const profitOverTime = [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, v]) => ({ period, sales: v.sales, profit: v.profit }));

  // Deals by status (all statuses, ignoring the APPROVED restriction)
  const allDeals = await db.deal.findMany({ where: baseWhere, select: { status: true } });
  const statusMap = new Map<string, number>();
  for (const d of allDeals) statusMap.set(d.status, (statusMap.get(d.status) ?? 0) + 1);
  const dealsByStatus = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"].map((s) => ({
    status: s,
    count: statusMap.get(s) ?? 0,
  }));

  // Commissions tied to the approved deals in range
  const dealIds = approved.map((d) => d.id);
  const commissions = dealIds.length
    ? await db.commission.findMany({
        where: { dealId: { in: dealIds } },
        select: { userId: true, amount: true, payoutStatus: true, user: { select: { fullName: true } } },
      })
    : [];

  let totalCommissions = 0, pendingPayouts = 0, myCommission = 0;
  const personMap = new Map<string, { name: string; amount: number }>();
  for (const c of commissions) {
    const a = Number(c.amount);
    totalCommissions += a;
    if (c.payoutStatus === "PENDING") pendingPayouts += a;
    if (c.userId === sessionUserId) myCommission += a;
    const e = personMap.get(c.userId) ?? { name: c.user.fullName, amount: 0 };
    e.amount += a;
    personMap.set(c.userId, e);
  }
  const commissionByPerson = [...personMap.entries()]
    .map(([userId, v]) => ({ userId, name: v.name, amount: v.amount, isMe: userId === sessionUserId }))
    .sort((a, b) => b.amount - a.amount);

  return {
    kpis: {
      totalSales, totalProfit, totalVat,
      dealCount: approved.length,
      totalCommissions, pendingPayouts, myCommission,
    },
    profitOverTime,
    dealsByStatus,
    commissionByPerson,
  };
}
