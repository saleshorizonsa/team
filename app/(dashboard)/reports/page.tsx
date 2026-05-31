import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReportsClient } from "./_components/reports-client";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const session = await auth();
  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });
  return <ReportsClient users={users} isAdmin={session?.user?.role === "ADMIN"} />;
}
