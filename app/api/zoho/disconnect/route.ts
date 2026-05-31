import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function POST() {
  try {
    const session = await auth();
    authorize(session, "adminOnly");

    await db.zohoConnection.updateMany({ where: { isActive: true }, data: { isActive: false } });

    await logAudit({
      userId: session!.user.id,
      action: "SETTINGS_CHANGE",
      entityType: "ZohoConnection",
      entityId: "zoho",
      after: { connected: false },
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
