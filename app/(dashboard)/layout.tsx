import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        {/* pb-16 gives room for mobile bottom nav */}
        <main className="flex-1 overflow-y-auto p-4 pb-16 md:p-6 md:pb-6 lg:p-8 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
