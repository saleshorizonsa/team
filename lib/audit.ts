import { db } from "@/lib/db";
import type { AuditAction } from "@prisma/client";

export async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  before,
  after,
}: {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}) {
  try {
    await db.auditLog.create({
      data: { userId, action, entityType, entityId, before, after },
    });
  } catch {
    // Audit failure must never break the primary operation
    console.error("[audit] failed to write", { userId, action, entityType, entityId });
  }
}
