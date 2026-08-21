import { CalendarClock } from "lucide-react";
import { type Route } from "next";
import { type ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";

/**
 * Nothing scheduled yet.
 *
 * Scheduling starts in the editor, not here, so an empty page that only said
 * "no posts" would leave the reader with no way to get one. It names the actual
 * route: generate a video, then publish it from the project.
 */
export function ScheduleEmpty(): ReactNode {
  return (
    <EmptyState
      icon={CalendarClock}
      title="Nothing scheduled yet"
      body="Posts arrive here from the editor. Open a project, generate a video, then choose Publish to pick the platforms and the time. Everything you queue shows up on this page, and you can change or cancel it here until it goes out."
      action={{ label: "Start a project", href: "/dashboard" as Route }}
    />
  );
}
