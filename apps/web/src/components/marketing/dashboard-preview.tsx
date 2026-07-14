import {
  CalendarClock,
  FolderKanban,
  LayoutDashboard,
  Play,
  Scissors,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface NavItem {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly active?: boolean;
}

interface Project {
  readonly title: string;
  readonly meta: string;
  readonly status: "Published" | "Scheduled" | "Generating";
}

const NAV: readonly NavItem[] = [
  { icon: LayoutDashboard, label: "Home" },
  { icon: FolderKanban, label: "Projects", active: true },
  { icon: Scissors, label: "Editor" },
  { icon: TrendingUp, label: "Trends" },
  { icon: CalendarClock, label: "Schedule" },
];

const PROJECTS: readonly Project[] = [
  { title: "Trail shoe launch", meta: "Instagram · today", status: "Published" },
  { title: "Founder story, part 2", meta: "TikTok · Fri 6:00pm", status: "Scheduled" },
  { title: "Summer sale teaser", meta: "YouTube Shorts", status: "Generating" },
];

const STATUS_STYLES: Record<Project["status"], string> = {
  Published: "bg-success/10 text-success",
  Scheduled: "bg-primary/10 text-primary",
  Generating: "bg-muted text-muted-foreground",
};

export function DashboardPreview(): ReactNode {
  return (
    <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
      <div className="grid grid-cols-[auto_1fr] overflow-hidden rounded-xl border border-border bg-background">
        <aside className="flex w-14 flex-col gap-1 border-r border-border p-3 lg:w-52">
          {NAV.map((item) => (
            <span
              key={item.label}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium",
                item.active ? "bg-secondary text-foreground" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </span>
          ))}
        </aside>

        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Projects</h3>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
                48 / 60 videos
              </span>
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                BS
              </span>
            </div>
          </div>

          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECTS.map((project) => (
              <li key={project.title} className="rounded-lg border border-border bg-card p-2.5">
                <div className="relative flex aspect-[9/16] items-center justify-center rounded-md bg-secondary">
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm">
                    <Play className="size-3.5 translate-x-px" />
                  </span>
                </div>
                <p className="mt-2.5 truncate text-sm font-medium">{project.title}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted-foreground">{project.meta}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      STATUS_STYLES[project.status],
                    )}
                  >
                    {project.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
