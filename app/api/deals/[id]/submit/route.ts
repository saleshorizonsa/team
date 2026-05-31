import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const INCLUDE = {
  customer: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
  salesperson: { select: { id: true, fullName: true } },
  createdBy: { select: { id: true, fullName: true } },
  lead: { select: { id: true, title: true } },
} as const;

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const { id } = await params;

    const deal = await db.deal.findFirst({ where: { id, deletedAt: null } });
    if (!deal) return Response.json({ error: "Not found" }, { status: 404 });

    // Only owner (or admin) can submit, and only from DRAFT or REJECTED.
    authorize(session, "editOwn", { createdById: deal.createdById });

    if (deal.status !== "DRAFT" && deal.status !== "REJECTED") {
      return Response.json(
        { error: `Cannot submit a deal that is ${deal.status}` },
        { status: 422 }
      );
    }

    const updated = await db.deal.update({
      where: { id },
      data: { status: "SUBMITTED", rejectReason: null },
      include: INCLUDE,
    });

    await logAudit({
      userId: session!.user.id,
      action: "UPDATE",
      entityType: "Deal",
      entityId: id,
      before: { status: deal.status },
      after: { status: "SUBMITTED" },
    });

    return Response.json(updated);
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
