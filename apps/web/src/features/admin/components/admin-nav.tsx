"use client";

import {
  Activity,
  BookOpenText,
  Bug,
  ClipboardList,
  Coins,
  CreditCard,
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
  { href: "/dashboard/admin/legal", label: "Legal", icon: BookOpenText },
  { href: "/dashboard/admin/model-pricing", label: "Model pricing", icon: Coins },
  { href: "/dashboard/admin/provider-credits", label: "Provider credits", icon: CreditCard },
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
    <nav
      aria-label="Admin sections"
      className="lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:w-52 lg:shrink-0 lg:self-start lg:overflow-y-auto"
    >
      <div className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
        {SECTIONS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              // Matches SettingsRail's treatment: a soft fill for the active
              // row rather than an inverted block. The inverted "bg-ink
              // text-canvas" pill this used to be was heavier than every
              // other section nav in the app, so Admin was the one place
              // that looked like a different product.
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:w-full lg:rounded-lg lg:px-3 lg:py-2 ${
                active
                  ? "bg-cloud font-medium text-ink"
                  : "text-ink-soft hover:bg-cloud/60 hover:text-ink"
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
