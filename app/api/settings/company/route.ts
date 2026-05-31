import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { companySchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const session = await auth();
    authorize(session, "adminOnly");

    const body = await req.json();
    const data = companySchema.parse(body);

    const before = await db.setting.findUnique({ where: { key: "company_info" } });

    await db.setting.upsert({
      where: { key: "company_info" },
      create: { key: "company_info", value: data as unknown as Prisma.InputJsonValue },
      update: { value: data as unknown as Prisma.InputJsonValue },
    });

    await logAudit({
      userId: session!.user.id,
      action: "SETTINGS_CHANGE",
      entityType: "Setting",
      entityId: "company_info",
      before: before?.value ?? undefined,
      after: data,
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
