import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AccountClient } from "./_components/account-client";

export const metadata = { title: "My Account" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AccountClient
      name={session.user.name ?? ""}
      email={session.user.email ?? ""}
      role={session.user.role ?? "USER"}
    />
  );
}
