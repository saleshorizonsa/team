import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AuditClient } from "./_components/audit-client";

export const metadata = { title: "Activity" };

export default async function AuditPage() {
  const session = await auth();
  const isAdmin = session!.user.role === "ADMIN";

  const [entries, users] = await Promise.all([
    db.auditLog.findMany({
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: isAdmin ? 300 : 60,
    }),
    isAdmin
      ? db.user.findMany({ select: { id: true, fullName: true }, orderBy: { fullName: "asc" } })
      : Promise.resolve([] as { id: string; fullName: string }[]),
  ]);

  const serialized = entries.map((e) => ({
    id: e.id,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId,
    userName: e.user.fullName,
    createdAt: e.createdAt,
  }));

  return <AuditClient initialEntries={serialized} users={users} isAdmin={isAdmin} />;
}
