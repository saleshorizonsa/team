import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { getActiveConnection, ensureOrganizationId, zohoApiGet } from "@/lib/zoho";
import { mapInvoiceToPreview } from "@/lib/zoho-map";
import { generateDealNumber } from "@/lib/deal-number";
import { z } from "zod";

const importSchema = z.object({
  invoiceId: z.string().min(1),
  salespersonId: z.string().min(1, "Salesperson is required"),
  purchaseTotal: z.string().optional(), // manual entry or from a Bill
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    authorize(session, "adminOnly"); // import is ADMIN-only

    const conn = await getActiveConnection();
    if (!conn) return Response.json({ error: "Zoho is not connected" }, { status: 400 });
    const orgId = await ensureOrganizationId(conn);

    const body = await req.json();
    const { invoiceId, salespersonId, purchaseTotal } = importSchema.parse(body);

    // Idempotency: block double import
    const existing = await db.deal.findUnique({ where: { zohoInvoiceId: invoiceId } });
    if (existing) {
      return Response.json(
        { error: `Already imported as ${existing.dealNumber}`, dealNumber: existing.dealNumber },
        { status: 409 }
      );
    }

    const data = await zohoApiGet<{ invoice: Record<string, unknown> }>(conn, `/invoices/${invoiceId}`, {
      organization_id: orgId,
    });
    const inv = mapInvoiceToPreview(data.invoice);

    // Match or create the Customer by name (Zoho stays invisible to the team)
    let customer = await db.customer.findFirst({
      where: { name: inv.customerName, deletedAt: null },
    });
    if (!customer) {
      customer = await db.customer.create({
        data: { name: inv.customerName || "Unknown (Zoho)", createdById: session!.user.id },
      });
    }

    const salesTotal = inv.subTotal;
    const pt = purchaseTotal && purchaseTotal !== "" ? parseFloat(purchaseTotal) : 0;
    const transportation = 0;
    const profit = salesTotal - pt - transportation;
    const dealNumber = await generateDealNumber();

    const deal = await db.deal.create({
      data: {
        dealNumber,
        customerId: customer.id,
        salespersonId,
        salesTotal: new Prisma.Decimal(salesTotal.toFixed(2)),
        purchaseTotal: new Prisma.Decimal(pt.toFixed(2)),
        transportation: new Prisma.Decimal(0),
        vatRatePercent: new Prisma.Decimal(inv.vatRatePercent.toFixed(2)),
        vatAmount: new Prisma.Decimal(inv.taxTotal.toFixed(2)),
        profit: new Prisma.Decimal(profit.toFixed(2)),
        status: "DRAFT",
        source: "ZOHO_IMPORT",
        zohoInvoiceId: inv.invoiceId,
        zohoInvoiceNumber: inv.invoiceNumber,
        dealDate: inv.date ? new Date(inv.date) : new Date(),
        notes: `Imported from Zoho invoice ${inv.invoiceNumber}`,
        createdById: session!.user.id,
      },
      include: {
        customer: { select: { id: true, name: true } },
        salesperson: { select: { id: true, fullName: true } },
      },
    });

    await logAudit({
      userId: session!.user.id,
      action: "ZOHO_IMPORT",
      entityType: "Deal",
      entityId: deal.id,
      after: { dealNumber, zohoInvoiceId: inv.invoiceId, zohoInvoiceNumber: inv.invoiceNumber, salesTotal },
    });

    return Response.json(
      { ok: true, dealId: deal.id, dealNumber: deal.dealNumber },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
