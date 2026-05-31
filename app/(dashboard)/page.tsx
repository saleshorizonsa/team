import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeDashboard } from "@/lib/dashboard";
import { DashboardClient } from "./_components/dashboard-client";

export const metadata = { title: "Dashboard" };

export default async function HomePage() {
  const session = await auth();

  const [data, users] = await Promise.all([
    computeDashboard({}, session!.user.id),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <DashboardClient
      initialData={data}
      users={users}
      currentUserName={session!.user.name ?? "You"}
    />
  );
}
