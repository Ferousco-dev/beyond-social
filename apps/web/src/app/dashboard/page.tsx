import { type Metadata } from "next";

import { DashboardHome } from "@/features/dashboard/components/dashboard-home";
import { getCurrentUser } from "@/lib/dashboard/current-user";
import { getSidebarProjects } from "@/lib/dashboard/queries";
import { getThread } from "@/lib/chat/thread";

export const metadata: Metadata = { title: "Dashboard" };

/** How many recent projects the start screen offers before it becomes a list. */
const RECENTS = 4;

export default async function DashboardPage() {
  // The "new" thread carries no messages, only the price of sending one, which
  // this screen needs for the same reason the conversation does: it spends.
  const [user, projects, thread] = await Promise.all([
    getCurrentUser(),
    getSidebarProjects(),
    getThread("new"),
  ]);

  return (
    <DashboardHome
      name={user.name}
      // Starting something new should not hide the work already in flight, but
      // this screen is for starting, so it is a handful rather than the sidebar
      // repeated down the middle of the page.
      recents={projects.slice(0, RECENTS).map(({ id, title }) => ({ id, title }))}
      credits={thread.credits}
    />
  );
}
