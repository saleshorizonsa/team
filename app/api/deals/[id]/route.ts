import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { dealSchema } from "@/lib/validations";

const INCLUDE = {
  customer: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
  salesperson: { select: { id: true, fullName: true } },
  createdBy: { select: { id: true, fullName: true } },
  lead: { select: { id: true, title: true } },
} as const;

async function getDeal(id: string) {
  const deal = await db.deal.findFirst({ where: { id, deletedAt: null } });
  if (!deal) throw new Response(null, { status: 404 });
  return deal;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    authorize(session, "read");
    const { id } = await params;
    const deal = await db.deal.findFirst({ where: { id, deletedAt: null }, include: INCLUDE });
    if (!deal) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(deal);
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const { id } = await params;
    const deal = await getDeal(id);

    // APPROVED deals: only ADMIN can edit. Otherwise: owner + DRAFT/REJECTED.
    if (deal.status === "APPROVED" || deal.status === "SUBMITTED") {
      authorize(session, "editAny"); // ADMIN only
    } else {
      authorize(session, "editOwn", { createdById: deal.createdById });
    }

    const body = await req.json();
    const data = dealSchema.parse(body);

    const st = parseFloat(data.salesTotal);
    const pt = parseFloat(data.purchaseTotal);
    const tr = parseFloat(data.transportation ?? "0");
    const vr = parseFloat(data.vatRatePercent);
    const profit = st - pt - tr;
    const vatAmount = (st * vr) / 100;

    const before = { ...deal };

    const updated = await db.deal.update({
      where: { id },
      data: {
        customerId: data.customerId,
        supplierId: data.supplierId || null,
        salespersonId: data.salespersonId,
        dealDate: new Date(data.dealDate),
        salesTotal: st,
        purchaseTotal: pt,
        transportation: tr,
        vatRatePercent: vr,
        vatAmount,
        profit,
        notes: data.notes || null,
      },
      include: INCLUDE,
    });

    await logAudit({
      userId: session!.user.id,
      action: "UPDATE",
      entityType: "Deal",
      entityId: id,
      before: before as Record<string, unknown>,
      after: updated as Record<string, unknown>,
    });

    return Response.json(updated);
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    if (e instanceof Response) return e;
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const { id } = await params;
    const deal = await getDeal(id);

    // APPROVED/SUBMITTED deals: ADMIN only. Otherwise owner of DRAFT/REJECTED.
    if (deal.status === "APPROVED" || deal.status === "SUBMITTED") {
      authorize(session, "deleteAny");
    } else {
      authorize(session, "deleteOwn", { createdById: deal.createdById });
    }

    await db.deal.update({ where: { id }, data: { deletedAt: new Date() } });

    // Unlink any lead that pointed to this deal
    await db.lead.updateMany({
      where: { convertedDealId: id },
      data: { convertedDealId: null },
    });

    await logAudit({
      userId: session!.user.id,
      action: "DELETE",
      entityType: "Deal",
      entityId: id,
      before: deal as Record<string, unknown>,
    });

    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    if (e instanceof Response) return e;
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
