import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { resetPasswordSchema } from "@/lib/validations";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    authorize(session, "adminOnly");

    const { id } = await params;
    const user = await db.user.findUnique({ where: { id } });
    if (!user) return Response.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { password } = resetPasswordSchema.parse(body);

    const passwordHash = await bcrypt.hash(password, 12);
    await db.user.update({ where: { id }, data: { passwordHash } });

    await logAudit({
      userId: session!.user.id,
      action: "UPDATE",
      entityType: "User",
      entityId: id,
      after: { passwordReset: true },
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
