import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";

// POST: mark notifications read. Body { ids?: string[] } — omit ids to mark all read.
export async function POST(req: Request) {
  try {
    const session = await auth();
    authorize(session, "read");
    const userId = session!.user.id;

    let ids: string[] | undefined;
    try {
      const body = await req.json();
      if (Array.isArray(body?.ids)) ids = body.ids.filter((x: unknown) => typeof x === "string");
    } catch {
      // no body → mark all
    }

    await db.notification.updateMany({
      where: {
        userId,
        readAt: null,
        ...(ids && ids.length ? { id: { in: ids } } : {}),
      },
      data: { readAt: new Date() },
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
