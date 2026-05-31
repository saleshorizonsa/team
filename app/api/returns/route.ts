import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { returnSchema } from "@/lib/validations";
import { recordReturn } from "@/lib/return-service";

export async function GET(req: Request) {
  try {
    const session = await auth();
    authorize(session, "read");

    const { searchParams } = new URL(req.url);
    const dealId = searchParams.get("dealId");

    const returns = await db.return.findMany({
      where: { ...(dealId ? { dealId } : {}) },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        deal: { select: { id: true, dealNumber: true, customer: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(
      returns.map((r) => ({
        id: r.id,
        returnNumber: r.returnNumber,
        dealId: r.dealId,
        dealNumber: r.deal.dealNumber,
        customerName: r.deal.customer.name,
        returnDate: r.returnDate,
        returnedSalesAmount: Number(r.returnedSalesAmount),
        costRecovered: Number(r.costRecovered),
        returnCosts: Number(r.returnCosts),
        reversedProfit: Number(r.reversedProfit),
        reason: r.reason,
        createdBy: r.createdBy.fullName,
        createdAt: r.createdAt,
      }))
    );
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    authorize(session, "approve"); // ADMIN only — returns reverse realized profit/commissions

    const body = await req.json();
    const data = returnSchema.parse(body);

    const ret = await recordReturn(
      {
        dealId: data.dealId,
        returnDate: new Date(data.returnDate),
        returnedSalesAmount: parseFloat(data.returnedSalesAmount),
        costRecovered: parseFloat(data.costRecovered),
        returnCosts: parseFloat(data.returnCosts ?? "0"),
        reason: data.reason || null,
      },
      session!.user.id
    );

    await logAudit({
      userId: session!.user.id,
      action: "RETURN",
      entityType: "Return",
      entityId: ret.id,
      after: {
        returnNumber: ret.returnNumber,
        dealId: ret.dealId,
        reversedProfit: Number(ret.reversedProfit),
      },
    });

    return Response.json(
      { id: ret.id, returnNumber: ret.returnNumber, reversedProfit: Number(ret.reversedProfit) },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    const msg = e instanceof Error ? e.message : "Server error";
    const code = msg.includes("APPROVED") || msg.includes("not found") ? 422 : 500;
    return Response.json({ error: msg }, { status: code });
  }
}
