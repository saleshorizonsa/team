import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { userCreateSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await auth();
    authorize(session, "read"); // all authenticated users may view the roster (transparency)

    const users = await db.user.findMany({
      select: {
        id: true, fullName: true, email: true, role: true,
        commissionSharePercent: true, isActive: true, createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    const serialized = users.map((u) => ({
      ...u,
      commissionSharePercent: u.commissionSharePercent != null ? Number(u.commissionSharePercent) : null,
    }));
    return Response.json(serialized);
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    authorize(session, "adminOnly");

    const body = await req.json();
    const data = userCreateSchema.parse(body);

    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) return Response.json({ error: "Email already in use" }, { status: 422 });

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await db.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        passwordHash,
        role: data.role,
        commissionSharePercent: data.commissionSharePercent ?? null,
        isActive: true,
      },
      select: {
        id: true, fullName: true, email: true, role: true,
        commissionSharePercent: true, isActive: true, createdAt: true,
      },
    });

    await logAudit({
      userId: session!.user.id,
      action: "CREATE",
      entityType: "User",
      entityId: user.id,
      after: { email: user.email, role: user.role },
    });

    return Response.json(
      { ...user, commissionSharePercent: user.commissionSharePercent != null ? Number(user.commissionSharePercent) : null },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
