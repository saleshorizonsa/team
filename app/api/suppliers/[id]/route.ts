import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { contactSchema } from "@/lib/validations";

async function getSupplier(id: string) {
  const s = await db.supplier.findFirst({ where: { id, deletedAt: null } });
  if (!s) throw new Response(null, { status: 404 });
  return s;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const { id } = await params;
    const supplier = await getSupplier(id);

    authorize(session, "editOwn", { createdById: supplier.createdById });

    const body = await req.json();
    const data = contactSchema.parse(body);
    const before = { ...supplier };

    const updated = await db.supplier.update({
      where: { id },
      data: {
        name: data.name,
        contactPerson: data.contactPerson || null,
        phone: data.phone || null,
        email: data.email || null,
        vatNumber: data.vatNumber || null,
        notes: data.notes || null,
      },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });

    await logAudit({
      userId: session!.user.id,
      action: "UPDATE",
      entityType: "Supplier",
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
    const supplier = await getSupplier(id);

    authorize(session, "deleteOwn", { createdById: supplier.createdById });

    await db.supplier.update({ where: { id }, data: { deletedAt: new Date() } });

    await logAudit({
      userId: session!.user.id,
      action: "DELETE",
      entityType: "Supplier",
      entityId: id,
      before: supplier as Record<string, unknown>,
    });

    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    if (e instanceof Response) return e;
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
