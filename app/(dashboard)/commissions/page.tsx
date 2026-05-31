import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CommissionsClient } from "./_components/commissions-client";

export const metadata = { title: "Commissions" };

export default async function CommissionsPage() {
  const session = await auth();

  const commissions = await db.commission.findMany({
    include: {
      user: { select: { id: true, fullName: true, role: true } },
      deal: {
        select: {
          id: true, dealNumber: true, profit: true,
          customer: { select: { name: true } },
        },
      },
    },
    orderBy: [{ period: "desc" }, { createdAt: "desc" }],
  });

  const serialized = commissions.map((c) => ({
    id: c.id,
    period: c.period,
    type: c.type,
    percent: Number(c.percent),
    amount: Number(c.amount),
    payoutStatus: c.payoutStatus,
    paidAt: c.paidAt,
    user: c.user,
    deal: {
      id: c.deal.id,
      dealNumber: c.deal.dealNumber,
      profit: Number(c.deal.profit),
      customer: c.deal.customer,
    },
  }));

  return (
    <CommissionsClient
      initialCommissions={serialized}
      isAdmin={session!.user.role === "ADMIN"}
      sessionUserId={session!.user.id}
    />
  );
}
