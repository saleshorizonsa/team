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

// POST: approve many SUBMITTED deals at once. ADMIN only. Body { ids: string[] }.
export async function POST(req: Request) {
  try {
    const session = await auth();
    authorize(session, "approve"); // ADMIN only

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];
    if (ids.length === 0) return Response.json({ error: "No deals selected" }, { status: 400 });

    // Only act on deals that are actually SUBMITTED and not deleted.
    const candidates = await db.deal.findMany({
      where: { id: { in: ids }, deletedAt: null, status: "SUBMITTED" },
      select: { id: true },
    });

    const approved: unknown[] = [];
    const adminId = session!.user.id;

    for (const { id } of candidates) {
      const updated = await db.deal.update({
        where: { id },
        data: { status: "APPROVED", approvedById: adminId, approvedAt: new Date(), rejectReason: null },
        include: INCLUDE,
      });
      await generateCommissionsForDeal(id);
      await logAudit({
        userId: adminId,
        action: "APPROVE",
        entityType: "Deal",
        entityId: id,
        before: { status: "SUBMITTED" },
        after: { status: "APPROVED", approvedById: adminId },
      });
      if (updated.createdById !== adminId) {
        await notify([{
          userId: updated.createdById,
          type: "DEAL_APPROVED",
          message: `${updated.dealNumber} was approved`,
          link: "/deals",
        }]);
      }
      approved.push(updated);
    }

    return Response.json({
      approved: approved.length,
      skipped: ids.length - approved.length,
      deals: approved,
    });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
