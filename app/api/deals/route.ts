import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { dealSchema } from "@/lib/validations";
import { generateDealNumber } from "@/lib/deal-number";
import type { DealStatus } from "@prisma/client";

const INCLUDE = {
  customer: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
  salesperson: { select: { id: true, fullName: true } },
  createdBy: { select: { id: true, fullName: true } },
  lead: { select: { id: true, title: true } },
} as const;

export async function GET(req: Request) {
  try {
    const session = await auth();
    authorize(session, "read");

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as DealStatus | null;
    const salespersonId = searchParams.get("salespersonId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const q = searchParams.get("q")?.trim() || "";

    const deals = await db.deal.findMany({
      where: {
        deletedAt: null,
        ...(status && { status }),
        ...(salespersonId && { salespersonId }),
        ...(from && { dealDate: { gte: new Date(from) } }),
        ...(to && { dealDate: { lte: new Date(to) } }),
        ...(q && {
          OR: [
            { dealNumber: { contains: q } },
            { customer: { name: { contains: q } } },
            { salesperson: { fullName: { contains: q } } },
          ],
        }),
      },
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    return Response.json(deals);
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    authorize(session, "create");

    const body = await req.json();
    const data = dealSchema.parse(body);

    const st = parseFloat(data.salesTotal);
    const pt = parseFloat(data.purchaseTotal);
    const tr = parseFloat(data.transportation ?? "0");
    const vr = parseFloat(data.vatRatePercent);
    const profit = st - pt - tr;
    const vatAmount = st * vr / 100;

    const dealNumber = await generateDealNumber();

    const deal = await db.deal.create({
      data: {
        dealNumber,
        customerId: data.customerId,
        supplierId: data.supplierId || null,
        salespersonId: data.salespersonId,
        leadId: data.leadId || null,
        dealDate: new Date(data.dealDate),
        salesTotal: st,
        purchaseTotal: pt,
        transportation: tr,
        vatRatePercent: vr,
        vatAmount,
        profit,
        status: "DRAFT",
        notes: data.notes || null,
        createdById: session!.user.id,
      },
      include: INCLUDE,
    });

    // If this deal converts a lead, link it back
    if (data.leadId) {
      await db.lead.update({
        where: { id: data.leadId },
        data: { convertedDealId: deal.id },
      });
    }

    await logAudit({
      userId: session!.user.id,
      action: "CREATE",
      entityType: "Deal",
      entityId: deal.id,
      after: { dealNumber, status: "DRAFT" },
    });

    return Response.json(deal, { status: 201 });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    console.error(e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
