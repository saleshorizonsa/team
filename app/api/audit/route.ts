import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError, isAdmin } from "@/lib/authz";
import type { Prisma, AuditAction } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await auth();
    authorize(session, "read"); // transparency — all authenticated users may view activity

    const { searchParams } = new URL(req.url);
    const admin = isAdmin(session);

    // Only admins may use the granular filters; users get the plain recent feed.
    const action = admin ? (searchParams.get("action") as AuditAction | null) : null;
    const entityType = admin ? searchParams.get("entityType") : null;
    const userId = admin ? searchParams.get("userId") : null;
    const from = admin ? searchParams.get("from") : null;
    const to = admin ? searchParams.get("to") : null;

    const dateFilter: Prisma.DateTimeFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const where: Prisma.AuditLogWhereInput = {
      ...(action ? { action } : {}),
      ...(entityType ? { entityType } : {}),
      ...(userId ? { userId } : {}),
      ...(from || to ? { createdAt: dateFilter } : {}),
    };

    const entries = await db.auditLog.findMany({
      where,
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: admin ? 300 : 60,
    });

    return Response.json(
      entries.map((e) => ({
        id: e.id,
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId,
        userName: e.user.fullName,
        createdAt: e.createdAt,
      }))
    );
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
