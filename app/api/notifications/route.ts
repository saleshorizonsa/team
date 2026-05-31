import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";

// GET: the current user's recent notifications + unread count.
export async function GET() {
  try {
    const session = await auth();
    authorize(session, "read");
    const userId = session!.user.id;

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      db.notification.count({ where: { userId, readAt: null } }),
    ]);

    return Response.json({ notifications, unreadCount });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
