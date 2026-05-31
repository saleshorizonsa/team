import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { LeadsClient } from "./_components/leads-client";

export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  const session = await auth();

  const [leads, customers, users] = await Promise.all([
    db.lead.findMany({
      where: { deletedAt: null },
      include: {
        owner: { select: { id: true, fullName: true } },
        customer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.customer.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  // Prisma Decimal isn't serializable across the RSC boundary — convert to number.
  const serializedLeads = leads.map((l) => ({
    ...l,
    estimatedValue: Number(l.estimatedValue),
  }));

  return (
    <LeadsClient
      initialLeads={serializedLeads}
      customers={customers}
      users={users}
      sessionUserId={session!.user.id}
      isAdmin={session!.user.role === "ADMIN"}
    />
  );
}
