import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SuppliersClient } from "./_components/suppliers-client";

export const metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  const session = await auth();

  const suppliers = await db.supplier.findMany({
    where: { deletedAt: null },
    include: { createdBy: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <SuppliersClient
      initialSuppliers={suppliers as Parameters<typeof SuppliersClient>[0]["initialSuppliers"]}
      sessionUserId={session!.user.id}
      isAdmin={session!.user.role === "ADMIN"}
    />
  );
}
