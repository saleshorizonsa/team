import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CustomersClient } from "./_components/customers-client";

export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  const session = await auth();

  const [customers, suppliers] = await Promise.all([
    db.customer.findMany({
      where: { deletedAt: null },
      include: { createdBy: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    // preload suppliers for deal forms later
    Promise.resolve([]),
  ]);

  return (
    <CustomersClient
      initialCustomers={customers as Parameters<typeof CustomersClient>[0]["initialCustomers"]}
      sessionUserId={session!.user.id}
      isAdmin={session!.user.role === "ADMIN"}
    />
  );
}
