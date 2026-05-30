import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { contactSchema } from "@/lib/validations";

export async function GET(req: Request) {
  try {
    const session = await auth();
    authorize(session, "read");

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";

    const customers = await db.customer.findMany({
      where: {
        deletedAt: null,
        ...(q && {
          OR: [
            { name: { contains: q } },
            { contactPerson: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        }),
      },
      include: { createdBy: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(customers);
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
    const data = contactSchema.parse(body);

    const customer = await db.customer.create({
      data: {
        name: data.name,
        contactPerson: data.contactPerson || null,
        phone: data.phone || null,
        email: data.email || null,
        vatNumber: data.vatNumber || null,
        notes: data.notes || null,
        createdById: session!.user.id,
      },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });

    await logAudit({
      userId: session!.user.id,
      action: "CREATE",
      entityType: "Customer",
      entityId: customer.id,
      after: customer as Record<string, unknown>,
    });

    return Response.json(customer, { status: 201 });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
