import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { generateCommissionsForDeal } from "@/lib/commission-service";

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
    authorize(session, "approve"); // ADMIN only

    const { id } = await params;
    const deal = await db.deal.findFirst({ where: { id, deletedAt: null } });
    if (!deal) return Response.json({ error: "Not found" }, { status: 404 });

    if (deal.status !== "SUBMITTED") {
      return Response.json(
        { error: `Only SUBMITTED deals can be approved (this is ${deal.status})` },
        { status: 422 }
      );
    }

    const updated = await db.deal.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: session!.user.id,
        approvedAt: new Date(),
        rejectReason: null,
      },
      include: INCLUDE,
    });

    // Generate commission rows from the current commission rules.
    await generateCommissionsForDeal(id);

    await logAudit({
      userId: session!.user.id,
      action: "APPROVE",
      entityType: "Deal",
      entityId: id,
      before: { status: "SUBMITTED" },
      after: { status: "APPROVED", approvedById: session!.user.id },
    });

    // Notify the deal's creator (unless they approved their own).
    if (deal.createdById !== session!.user.id) {
      await notify([{
        userId: deal.createdById,
        type: "DEAL_APPROVED",
        message: `${updated.dealNumber} was approved`,
        link: "/deals",
      }]);
    }

    return Response.json(updated);
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
