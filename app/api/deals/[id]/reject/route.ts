import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { rejectSchema } from "@/lib/validations";

const INCLUDE = {
  customer: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
  salesperson: { select: { id: true, fullName: true } },
  createdBy: { select: { id: true, fullName: true } },
  lead: { select: { id: true, title: true } },
} as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    authorize(session, "approve"); // ADMIN only (approve/reject share the gate)

    const { id } = await params;
    const deal = await db.deal.findFirst({ where: { id, deletedAt: null } });
    if (!deal) return Response.json({ error: "Not found" }, { status: 404 });

    if (deal.status !== "SUBMITTED") {
      return Response.json(
        { error: `Only SUBMITTED deals can be rejected (this is ${deal.status})` },
        { status: 422 }
      );
    }

    const body = await req.json();
    const { reason } = rejectSchema.parse(body);

    const updated = await db.deal.update({
      where: { id },
      data: { status: "REJECTED", rejectReason: reason },
      include: INCLUDE,
    });

    await logAudit({
      userId: session!.user.id,
      action: "REJECT",
      entityType: "Deal",
      entityId: id,
      before: { status: "SUBMITTED" },
      after: { status: "REJECTED", rejectReason: reason },
    });

    // Notify the deal's creator (unless they rejected their own).
    if (deal.createdById !== session!.user.id) {
      await notify([{
        userId: deal.createdById,
        type: "DEAL_REJECTED",
        message: `${updated.dealNumber} was rejected: ${reason}`,
        link: "/deals",
      }]);
    }

    return Response.json(updated);
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
