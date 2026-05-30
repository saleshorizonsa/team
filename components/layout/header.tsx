"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Moon, Sun } from "lucide-react";
import { useState } from "react";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/leads": "Leads",
  "/deals": "Deals",
  "/commissions": "Commissions",
  "/customers": "Customers",
  "/suppliers": "Suppliers",
  "/audit": "Audit Log",
  "/settings": "Settings",
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
  const [dark, setDark] = useState(false);

  function toggleDark() {
    setDark((d) => !d);
    document.documentElement.classList.toggle("dark");
  }

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:px-6">
      <h2 className="text-base font-semibold">{getTitle(pathname)}</h2>

      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* User avatar */}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary"
          title={session?.user?.email ?? ""}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
