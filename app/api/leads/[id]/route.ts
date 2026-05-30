import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { leadSchema } from "@/lib/validations";
import type { LeadSource, LeadStage } from "@prisma/client";

const LOCKED_STAGES: LeadStage[] = ["WON", "LOST"];

async function getLead(id: string) {
  const lead = await db.lead.findFirst({ where: { id, deletedAt: null } });
  if (!lead) throw new Response(null, { status: 404 });
  return lead;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    authorize(session, "read");
    const { id } = await params;
    const lead = await db.lead.findFirst({
      where: { id, deletedAt: null },
      include: {
        owner: { select: { id: true, fullName: true } },
        customer: { select: { id: true, name: true } },
      },
    });
    if (!lead) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(lead);
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const { id } = await params;
    const lead = await getLead(id);

    // Treat WON/LOST like non-DRAFT for USER; admin can always edit
    const syntheticStatus = LOCKED_STAGES.includes(lead.stage) ? "LOCKED" : "DRAFT";
    authorize(session, "editOwn", { ownerId: lead.ownerId, status: syntheticStatus });

    const body = await req.json();
    const data = leadSchema.parse(body);
    const before = { ...lead };

    const updated = await db.lead.update({
      where: { id },
      data: {
        title: data.title,
        customerId: data.customerId || null,
        contactName: data.contactName || null,
        phone: data.phone || null,
        email: data.email || null,
        source: data.source as LeadSource,
        estimatedValue: parseFloat(data.estimatedValue),
        notes: data.notes || null,
        lostReason: data.lostReason || null,
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
    const lead = await getLead(id);

    const syntheticStatus = LOCKED_STAGES.includes(lead.stage) ? "LOCKED" : "DRAFT";
    authorize(session, "deleteOwn", { ownerId: lead.ownerId, status: syntheticStatus });

    await db.lead.update({ where: { id }, data: { deletedAt: new Date() } });

    await logAudit({
      userId: session!.user.id,
      action: "DELETE",
      entityType: "Lead",
      entityId: id,
      before: lead as Record<string, unknown>,
    });

    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    if (e instanceof Response) return e;
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
