import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { changePasswordSchema } from "@/lib/validations";

// POST: the signed-in user changes their own password.
export async function POST(req: Request) {
  try {
    const session = await auth();
    authorize(session, "read"); // any authenticated user, acting on self
    const userId = session!.user.id;

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const { currentPassword, newPassword } = parsed.data;

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return Response.json({ error: "User not found" }, { status: 404 });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return Response.json({ error: "Current password is incorrect" }, { status: 422 });
    }

    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      return Response.json(
        { error: "New password must be different from the current one" },
        { status: 422 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.user.update({ where: { id: userId }, data: { passwordHash } });

    await logAudit({
      userId,
      action: "UPDATE",
      entityType: "User",
      entityId: userId,
      after: { passwordChanged: true },
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
