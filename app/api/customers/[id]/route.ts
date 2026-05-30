import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { contactSchema } from "@/lib/validations";

async function getCustomer(id: string) {
  const customer = await db.customer.findFirst({ where: { id, deletedAt: null } });
  if (!customer) throw new Response(null, { status: 404 });
  return customer;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    authorize(session, "read");
    const { id } = await params;
    const customer = await getCustomer(id);
    return Response.json(customer);
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    if (e instanceof Response) return e;
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const { id } = await params;
    const customer = await getCustomer(id);

    authorize(session, "editOwn", { createdById: customer.createdById });

    const body = await req.json();
    const data = contactSchema.parse(body);
    const before = { ...customer };

    const updated = await db.customer.update({
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
      entityType: "Customer",
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
    const customer = await getCustomer(id);

    authorize(session, "deleteOwn", { createdById: customer.createdById });

    await db.customer.update({ where: { id }, data: { deletedAt: new Date() } });

    await logAudit({
      userId: session!.user.id,
      action: "DELETE",
      entityType: "Customer",
      entityId: id,
      before: customer as Record<string, unknown>,
    });

    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    if (e instanceof Response) return e;
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
