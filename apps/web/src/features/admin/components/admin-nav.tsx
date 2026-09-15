"use client";

import {
  Activity,
  Bug,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  LineChart,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { type Route } from "next";

const SECTIONS: ReadonlyArray<{ href: Route; label: string; icon: typeof Users }> = [
  { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/admin/users", label: "Users", icon: Users },
  { href: "/dashboard/admin/health", label: "Health", icon: Activity },
  { href: "/dashboard/admin/analytics", label: "Analytics", icon: LineChart },
  { href: "/dashboard/admin/audit", label: "Audit log", icon: ClipboardList },
  { href: "/dashboard/admin/config", label: "App config", icon: SlidersHorizontal },
  { href: "/dashboard/admin/secrets", label: "Secrets", icon: KeyRound },
  { href: "/dashboard/admin/debug", label: "Debug", icon: Bug },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/dashboard/admin" ? pathname === href : pathname.startsWith(href);
}

/** Section nav: a left rail on desktop, a horizontal tab bar down to phone widths. */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="lg:w-52 lg:shrink-0">
      <div className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
        {SECTIONS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:w-full lg:rounded-lg ${
                active
                  ? "bg-ink text-canvas"
                  : "text-ink-soft hover:bg-cloud hover:text-ink"
              }`}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
