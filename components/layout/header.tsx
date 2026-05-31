"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/use-theme";
import { NotificationBell } from "./notification-bell";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/leads": "Leads",
  "/deals": "Deals",
  "/commissions": "Commissions",
  "/reports": "Reports",
  "/customers": "Customers",
  "/suppliers": "Suppliers",
  "/audit": "Activity",
  "/settings": "Settings",
  "/account": "My Account",
};

function getTitle(pathname: string): string {
  for (const [key, title] of Object.entries(PAGE_TITLES)) {
    if (key === "/" ? pathname === "/" : pathname.startsWith(key)) return title;
  }
  return "Team Trading";
}

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { dark, toggle } = useTheme();

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:px-6">
      <h2 className="text-base font-semibold">{getTitle(pathname)}</h2>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <NotificationBell />

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* User avatar → My Account */}
        <Link
          href="/account"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary transition-colors hover:bg-primary/30"
          title={session?.user?.email ? `${session.user.email} — My Account` : "My Account"}
        >
          {initials}
        </Link>
      </div>
    </header>
  );
}
