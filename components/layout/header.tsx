"use client";

import { Moon, Sun, Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/leads": "Leads",
  "/deals": "Deals",
  "/commissions": "Commissions",
  "/customers": "Customers",
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
  const [dark, setDark] = useState(false);

  function toggleDark() {
    setDark((d) => !d);
    document.documentElement.classList.toggle("dark");
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:px-6">
      <h2 className="text-base font-semibold">{getTitle(pathname)}</h2>
      <div className="flex items-center gap-2">
        {/* Notifications — Phase 2 */}
        <button
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* User avatar — Phase 1 */}
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
          ?
        </div>
      </div>
    </header>
  );
}
