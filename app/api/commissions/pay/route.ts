import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const paySchema = z.object({
  ids: z.array(z.string()).min(1, "No commissions selected"),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    authorize(session, "adminOnly");

    const body = await req.json();
    const { ids } = paySchema.parse(body);

    const now = new Date();
    const result = await db.commission.updateMany({
      where: { id: { in: ids }, payoutStatus: "PENDING" },
      data: { payoutStatus: "PAID", paidAt: now },
    });

    await logAudit({
      userId: session!.user.id,
      action: "PAYOUT",
      entityType: "Commission",
      entityId: ids.join(","),
      after: { markedPaid: result.count, ids },
    });

    return Response.json({ ok: true, count: result.count, paidAt: now });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
