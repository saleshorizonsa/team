"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Handshake,
  Truck,
  TrendingUp,
  DollarSign,
  Settings,
  ScrollText,
  FileText,
  UserCog,
  ChevronLeft,
  Menu,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { signOut } from "next-auth/react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  phase?: number; // items locked until this phase
}

const navItems: NavItem[] = [
  { href: "/",             label: "Dashboard",   icon: LayoutDashboard },
  { href: "/leads",        label: "Leads",       icon: TrendingUp },
  { href: "/deals",        label: "Deals",       icon: Handshake },
  { href: "/commissions",  label: "Commissions", icon: DollarSign },
  { href: "/reports",      label: "Reports",     icon: FileText },
  { href: "/customers",    label: "Customers",   icon: Users },
  { href: "/suppliers",    label: "Suppliers",   icon: Truck },
  { href: "/audit",        label: "Activity",    icon: ScrollText },
  { href: "/settings",     label: "Settings",    icon: Settings,    adminOnly: true },
  { href: "/account",      label: "My Account",  icon: UserCog },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = session?.user?.role === "ADMIN";

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  function NavLink({ item }: { item: NavItem }) {
    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    const locked = !!item.phase;

    if (locked) {
      return (
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium opacity-40 cursor-not-allowed select-none",
            collapsed && "justify-center px-2"
          )}
          title={`Available in Phase ${item.phase}`}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <span className="flex-1">{item.label}</span>
          )}
        </div>
      );
    }

    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          collapsed && "justify-center px-2"
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r bg-card transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo + collapse toggle */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          {!collapsed && (
            <span className="truncate text-sm font-semibold tracking-tight">
              Team Trading
            </span>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {visibleItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* User section */}
        <div className="border-t p-2">
          {session?.user ? (
            <div className={cn("space-y-0.5", collapsed && "flex flex-col items-center")}>
              {!collapsed && (
                <div className="px-3 py-2">
                  <p className="truncate text-xs font-medium text-foreground">
                    {session.user.name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground capitalize">
                    {session.user.role?.toLowerCase()}
                  </p>
                </div>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-destructive transition-colors",
                  collapsed && "justify-center px-2"
                )}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Sign out</span>}
              </button>
            </div>
          ) : (
            !collapsed && (
              <div className="px-3 py-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </div>
            )
          )}
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t bg-card pb-safe md:hidden">
        {visibleItems.slice(0, 5).map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const locked = !!item.phase;
          return (
            <Link
              key={item.href}
              href={locked ? "#" : item.href}
              aria-disabled={locked}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                locked && "opacity-40 pointer-events-none",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
