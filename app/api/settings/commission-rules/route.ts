import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { commissionRulesSchema } from "@/lib/validations";
import {
  getCommissionRules,
  previewRecompute,
  recomputeAllPendingCommissions,
} from "@/lib/commission-service";
import type { CommissionRules } from "@/lib/commission";

export async function GET() {
  try {
    const session = await auth();
    authorize(session, "read");
    const rules = await getCommissionRules();
    return Response.json(rules);
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

// POST with { confirm: boolean, rules }. confirm=false → preview; confirm=true → apply.
export async function POST(req: Request) {
  try {
    const session = await auth();
    authorize(session, "adminOnly");

    const body = await req.json();
    const rules = commissionRulesSchema.parse(body.rules) as CommissionRules;

    if (!body.confirm) {
      const preview = await previewRecompute(rules);
      return Response.json(preview);
    }

    const before = await getCommissionRules();

    // Persist the rules
    await db.setting.upsert({
      where: { key: "commission_rules" },
      create: { key: "commission_rules", value: rules as unknown as Prisma.InputJsonValue },
      update: { value: rules as unknown as Prisma.InputJsonValue },
    });

    // Keep each user's mirror field in sync
    await Promise.all(
      Object.entries(rules.shares).map(([userId, pct]) =>
        db.user.update({ where: { id: userId }, data: { commissionSharePercent: pct } }).catch(() => {})
      )
    );

    // Recompute pending commissions everywhere (PAID rows untouched)
    const affectedDeals = await recomputeAllPendingCommissions(rules);

    await logAudit({
      userId: session!.user.id,
      action: "SETTINGS_CHANGE",
      entityType: "Setting",
      entityId: "commission_rules",
      before,
      after: rules,
    });

    return Response.json({ ok: true, affectedDeals });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    if (e && typeof e === "object" && "issues" in e) {
      return Response.json({ error: "Validation failed", issues: (e as { issues: unknown }).issues }, { status: 422 });
    }
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
