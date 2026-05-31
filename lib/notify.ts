import { db } from "@/lib/db";

export type NotifyType = "DEAL_SUBMITTED" | "DEAL_APPROVED" | "DEAL_REJECTED";

interface NotifyItem {
  userId: string;
  type: NotifyType;
  message: string;
  link?: string;
}

/** Create notification rows. Never throws — a notification failure must not break the primary action. */
export async function notify(items: NotifyItem[]): Promise<void> {
  if (items.length === 0) return;
  try {
    await db.notification.createMany({
      data: items.map((i) => ({
        userId: i.userId,
        type: i.type,
        message: i.message,
        link: i.link ?? null,
      })),
    });
  } catch (e) {
    console.error("[notify] failed to create notifications", e);
  }
}

/** Notify every active ADMIN (optionally excluding the actor). */
export async function notifyAdmins(
  type: NotifyType,
  message: string,
  link?: string,
  exceptUserId?: string
): Promise<void> {
  try {
    const admins = await db.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true },
    });
    await notify(
      admins
        .filter((a) => a.id !== exceptUserId)
        .map((a) => ({ userId: a.id, type, message, link }))
    );
  } catch (e) {
    console.error("[notify] failed to notify admins", e);
  }
}
