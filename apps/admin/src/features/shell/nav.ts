import {
  Activity,
  Bug,
  KeyRound,
  Layers,
  LayoutDashboard,
  ScrollText,
  Settings,
  SlidersHorizontal,
  ToggleLeft,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Every destination in the console, in one list.
 *
 * There are no hidden routes: a page that exists is a page reachable from here,
 * because a console with a URL only its author knows is a console nobody else
 * can operate. The list outgrew a flat six, so it is grouped by the question an
 * operator arrives with rather than nested into menus. Watch first, change
 * second, account for it third.
 */

export interface ConsoleRoute {
  readonly href: string;
  readonly label: string;
  /** Shown under the heading of the page and in the command list. */
  readonly description: string;
  readonly icon: LucideIcon;
}

export interface ConsoleGroup {
  readonly label: string;
  readonly routes: readonly ConsoleRoute[];
}

export const CONSOLE_GROUPS: readonly ConsoleGroup[] = [
  {
    label: "Observe",
    routes: [
      {
        href: "/overview",
        label: "Overview",
        description: "Platform totals and the health of the last few hours.",
        icon: LayoutDashboard,
      },
      {
        href: "/health",
        label: "Health",
        description: "Queue depth, job failures and provider reachability.",
        icon: Activity,
      },
      {
        href: "/queues",
        label: "Publishing queue",
        description: "What the publish-post queue holds right now, read straight from Redis.",
        icon: Layers,
      },
      {
        href: "/debug",
        label: "Debug",
        description: "Follow one trace, read the provider's real error, find abandoned work.",
        icon: Bug,
      },
    ],
  },
  {
    label: "Operate",
    routes: [
      {
        href: "/users",
        label: "Users",
        description: "Look up an account, see its workspaces and its current plan.",
        icon: Users,
      },
      {
        href: "/deleted",
        label: "Deleted accounts",
        description: "Accounts pending erasure, who deleted them, and how long is left to restore.",
        icon: Trash2,
      },
      {
        href: "/flags",
        label: "Feature flags",
        description: "Roll a capability out or pull it back. Every change is audited.",
        icon: ToggleLeft,
      },
      {
        href: "/config",
        label: "Configuration",
        description: "Operational limits and timeouts, with the history of who changed them.",
        icon: SlidersHorizontal,
      },
      {
        href: "/secrets",
        label: "Secrets",
        description: "What the platform needs, whether it is set, and who rotated it last.",
        icon: KeyRound,
      },
    ],
  },
  {
    label: "Account for it",
    routes: [
      {
        href: "/audit",
        label: "Audit log",
        description: "Every privileged action taken in this console, append only.",
        icon: ScrollText,
      },
      {
        href: "/settings",
        label: "Settings",
        description: "Preferences for this console.",
        icon: Settings,
      },
    ],
  },
];

/** The same routes without their grouping, for lookups and the collapsed rail. */
export const CONSOLE_ROUTES: readonly ConsoleRoute[] = CONSOLE_GROUPS.flatMap(
  (group) => group.routes,
);

/** Whether a route owns the current pathname, including its nested pages. */
export function isActiveRoute(route: ConsoleRoute, pathname: string): boolean {
  return pathname === route.href || pathname.startsWith(`${route.href}/`);
}

/** The route whose page is currently rendered, for headings and active states. */
export function routeFor(pathname: string): ConsoleRoute | undefined {
  return CONSOLE_ROUTES.find((route) => isActiveRoute(route, pathname));
}
