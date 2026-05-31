import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type ReportType = "sales" | "purchases" | "profit" | "vat" | "commissions" | "returns";

export interface ReportFilters {
  from?: string;
  to?: string;
  salespersonId?: string;
  userId?: string; // for commissions / statements
}

export type ReportRow = Record<string, string | number>;

function dealWhere(filters: ReportFilters): Prisma.DealWhereInput {
  const dateFilter: Prisma.DateTimeFilter = {};
  if (filters.from) dateFilter.gte = new Date(filters.from);
  if (filters.to) dateFilter.lte = new Date(filters.to);
  const hasDate = !!(filters.from || filters.to);
  return {
    deletedAt: null,
    status: "APPROVED",
    ...(hasDate ? { dealDate: dateFilter } : {}),
    ...(filters.salespersonId ? { salespersonId: filters.salespersonId } : {}),
  };
}

const fmtDate = (d: Date) => new Date(d).toISOString().slice(0, 10);

export async function computeReport(type: ReportType, filters: ReportFilters): Promise<ReportRow[]> {
  if (type === "commissions") {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (filters.from) dateFilter.gte = new Date(filters.from);
    if (filters.to) dateFilter.lte = new Date(filters.to);
    const hasDate = !!(filters.from || filters.to);

    const rows = await db.commission.findMany({
      where: {
        ...(filters.userId ? { userId: filters.userId } : {}),
        deal: {
          deletedAt: null,
          ...(hasDate ? { dealDate: dateFilter } : {}),
          ...(filters.salespersonId ? { salespersonId: filters.salespersonId } : {}),
        },
      },
      include: {
        user: { select: { fullName: true } },
        deal: { select: { dealNumber: true, customer: { select: { name: true } } } },
      },
      orderBy: [{ period: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((c) => ({
      Period: c.period,
      User: c.user.fullName,
      Type: c.type,
      Deal: c.deal.dealNumber,
      Customer: c.deal.customer.name,
      "Percent %": Number(c.percent),
      Amount: Number(c.amount),
      Status: c.payoutStatus,
    }));
  }

  if (type === "returns") {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (filters.from) dateFilter.gte = new Date(filters.from);
    if (filters.to) dateFilter.lte = new Date(filters.to);
    const hasDate = !!(filters.from || filters.to);
    const rows = await db.return.findMany({
      where: {
        ...(hasDate ? { returnDate: dateFilter } : {}),
        ...(filters.salespersonId ? { deal: { salespersonId: filters.salespersonId } } : {}),
      },
      include: { deal: { select: { dealNumber: true, customer: { select: { name: true } } } } },
      orderBy: { returnDate: "desc" },
    });
    return rows.map((r) => ({
      Return: r.returnNumber,
      Date: fmtDate(r.returnDate),
      Deal: r.deal.dealNumber,
      Customer: r.deal.customer.name,
      "Returned Sales": Number(r.returnedSalesAmount),
      "Cost Recovered": Number(r.costRecovered),
      "Return Costs": Number(r.returnCosts),
      "Reversed Profit": Number(r.reversedProfit),
      Reason: r.reason ?? "",
    }));
  }

  const deals = await db.deal.findMany({
    where: dealWhere(filters),
    include: {
      customer: { select: { name: true } },
      supplier: { select: { name: true } },
      salesperson: { select: { fullName: true } },
      returns: { select: { reversedProfit: true } },
    },
    orderBy: { dealDate: "desc" },
  });

  switch (type) {
    case "sales":
      return deals.map((d) => ({
        Deal: d.dealNumber,
        Date: fmtDate(d.dealDate),
        Customer: d.customer.name,
        Salesperson: d.salesperson.fullName,
        "Sales Total": Number(d.salesTotal),
      }));
    case "purchases":
      return deals.map((d) => ({
        Deal: d.dealNumber,
        Date: fmtDate(d.dealDate),
        Supplier: d.supplier?.name ?? "—",
        "Purchase Total": Number(d.purchaseTotal),
      }));
    case "profit":
      return deals.map((d) => {
        const gross = Number(d.profit);
        const returned = d.returns.reduce((s, r) => s + Number(r.reversedProfit), 0);
        return {
          Deal: d.dealNumber,
          Date: fmtDate(d.dealDate),
          Customer: d.customer.name,
          "Sales Total": Number(d.salesTotal),
          "Purchase Total": Number(d.purchaseTotal),
          Transportation: Number(d.transportation),
          "Gross Profit": gross,
          Returns: returned,
          "Net Profit": gross - returned,
        };
      });
    case "vat":
      return deals.map((d) => ({
        Deal: d.dealNumber,
        Date: fmtDate(d.dealDate),
        Customer: d.customer.name,
        "Sales Total": Number(d.salesTotal),
        "VAT Rate %": Number(d.vatRatePercent),
        "VAT Amount": Number(d.vatAmount),
      }));
    default:
      return [];
  }
}
