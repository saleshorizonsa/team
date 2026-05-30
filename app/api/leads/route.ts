import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { leadSchema } from "@/lib/validations";
import type { LeadSource, LeadStage } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await auth();
    authorize(session, "read");

    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage") as LeadStage | null;
    const source = searchParams.get("source") as LeadSource | null;
    const ownerId = searchParams.get("ownerId");
    const q = searchParams.get("q")?.trim() || "";

    const leads = await db.lead.findMany({
      where: {
        deletedAt: null,
        ...(stage && { stage }),
        ...(source && { source }),
        ...(ownerId && { ownerId }),
        ...(q && { title: { contains: q } }),
      },
      include: {
        owner: { select: { id: true, fullName: true } },
        customer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(leads);
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
    const data = leadSchema.parse(body);

    const lead = await db.lead.create({
      data: {
        title: data.title,
        customerId: data.customerId || null,
        contactName: data.contactName || null,
        phone: data.phone || null,
        email: data.email || null,
        source: data.source as LeadSource,
        stage: (data.stage ?? "NEW") as LeadStage,
        estimatedValue: parseFloat(data.estimatedValue),
        ownerId: session!.user.id,
        notes: data.notes || null,
      },
      include: {
        owner: { select: { id: true, fullName: true } },
        customer: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      userId: session!.user.id,
      action: "CREATE",
      entityType: "Lead",
      entityId: lead.id,
      after: lead as Record<string, unknown>,
    });

    return Response.json(lead, { status: 201 });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
