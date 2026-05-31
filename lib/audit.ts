import { db } from "@/lib/db";
import { Prisma, type AuditAction } from "@prisma/client";

/** Coerce any value (with Dates/Decimals) into a plain JSON value Prisma accepts. */
function toJson(v: unknown): Prisma.InputJsonValue | undefined {
  if (v === undefined || v === null) return undefined;
  return JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
}

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
  before?: unknown;
  after?: unknown;
}) {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        before: toJson(before),
        after: toJson(after),
      },
    });
  } catch {
    // Audit failure must never break the primary operation
    console.error("[audit] failed to write", { userId, action, entityType, entityId });
  }
}
