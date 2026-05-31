import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";

const d = (x: Date | string | null | undefined) => (x ? new Date(x).toISOString().slice(0, 10) : "");
const n = (x: unknown) => Number(x ?? 0);

// GET: full data backup as multi-sheet workbook payload. ADMIN only.
export async function GET() {
  try {
    const session = await auth();
    authorize(session, "adminOnly");

    const [deals, commissions, returns, customers, suppliers, users, leads] = await Promise.all([
      db.deal.findMany({
        where: { deletedAt: null },
        include: {
          customer: { select: { name: true } },
          supplier: { select: { name: true } },
          salesperson: { select: { fullName: true } },
          createdBy: { select: { fullName: true } },
        },
        orderBy: { dealDate: "desc" },
      }),
      db.commission.findMany({
        include: {
          user: { select: { fullName: true } },
          deal: { select: { dealNumber: true } },
        },
        orderBy: [{ period: "desc" }, { createdAt: "desc" }],
      }),
      db.return.findMany({
        include: { deal: { select: { dealNumber: true } } },
        orderBy: { returnDate: "desc" },
      }),
      db.customer.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
      db.supplier.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
      db.user.findMany({ orderBy: { fullName: "asc" } }),
      db.lead.findMany({
        where: { deletedAt: null },
        include: { owner: { select: { fullName: true } }, customer: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const sheets = [
      {
        name: "Deals",
        rows: deals.map((x) => ({
          Deal: x.dealNumber,
          Date: d(x.dealDate),
          Status: x.status,
          Customer: x.customer.name,
          Supplier: x.supplier?.name ?? "",
          Salesperson: x.salesperson.fullName,
          "Created By": x.createdBy.fullName,
          "Sales Total": n(x.salesTotal),
          "Purchase Total": n(x.purchaseTotal),
          Transportation: n(x.transportation),
          "VAT %": n(x.vatRatePercent),
          "VAT Amount": n(x.vatAmount),
          Profit: n(x.profit),
          Source: x.source,
          "Zoho Invoice": x.zohoInvoiceNumber ?? "",
        })),
      },
      {
        name: "Commissions",
        rows: commissions.map((x) => ({
          Period: x.period,
          User: x.user.fullName,
          Deal: x.deal.dealNumber,
          Type: x.type,
          "Percent %": n(x.percent),
          Amount: n(x.amount),
          Status: x.payoutStatus,
          "Paid At": d(x.paidAt),
        })),
      },
      {
        name: "Returns",
        rows: returns.map((x) => ({
          Return: x.returnNumber,
          Date: d(x.returnDate),
          Deal: x.deal.dealNumber,
          "Returned Sales": n(x.returnedSalesAmount),
          "Cost Recovered": n(x.costRecovered),
          "Return Costs": n(x.returnCosts),
          "Reversed Profit": n(x.reversedProfit),
          Reason: x.reason ?? "",
        })),
      },
      {
        name: "Customers",
        rows: customers.map((x) => ({
          Name: x.name, Contact: x.contactPerson ?? "", Phone: x.phone ?? "",
          Email: x.email ?? "", VAT: x.vatNumber ?? "",
        })),
      },
      {
        name: "Suppliers",
        rows: suppliers.map((x) => ({
          Name: x.name, Contact: x.contactPerson ?? "", Phone: x.phone ?? "",
          Email: x.email ?? "", VAT: x.vatNumber ?? "",
        })),
      },
      {
        name: "Users",
        rows: users.map((x) => ({
          Name: x.fullName, Email: x.email, Role: x.role,
          "Share %": x.commissionSharePercent == null ? "" : n(x.commissionSharePercent),
          Active: x.isActive ? "Yes" : "No",
        })),
      },
      {
        name: "Leads",
        rows: leads.map((x) => ({
          Title: x.title, Stage: x.stage, Source: x.source,
          Owner: x.owner.fullName, Customer: x.customer?.name ?? "",
          "Estimated Value": n(x.estimatedValue), Created: d(x.createdAt),
        })),
      },
    ];

    return Response.json({ sheets });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
