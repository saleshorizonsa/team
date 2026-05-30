import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { stageChangeSchema } from "@/lib/validations";
import type { LeadStage } from "@prisma/client";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const { id } = await params;

    const lead = await db.lead.findFirst({ where: { id, deletedAt: null } });
    if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

    // Only owner or admin can change stage; treat WON/LOST as locked for users
    const syntheticStatus = ["WON", "LOST"].includes(lead.stage) ? "LOCKED" : "DRAFT";
    authorize(session, "editOwn", { ownerId: lead.ownerId, status: syntheticStatus });

    const body = await req.json();
    const { stage, lostReason } = stageChangeSchema.parse(body);

    if (stage === "LOST" && !lostReason?.trim()) {
      return Response.json({ error: "lostReason is required when marking a lead as LOST" }, { status: 422 });
    }

    const before = { stage: lead.stage, lostReason: lead.lostReason };

    const updated = await db.lead.update({
      where: { id },
      data: {
        stage: stage as LeadStage,
        lostReason: stage === "LOST" ? lostReason : null,
      },
      include: {
        owner: { select: { id: true, fullName: true } },
        customer: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      userId: session!.user.id,
      action: "UPDATE",
      entityType: "Lead",
      entityId: id,
      before: before as Record<string, unknown>,
      after: { stage: updated.stage, lostReason: updated.lostReason },
    });

    return Response.json(updated);
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
