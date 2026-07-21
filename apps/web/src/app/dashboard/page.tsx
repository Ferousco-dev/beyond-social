import { type Metadata } from "next";

import { DashboardHome } from "@/features/dashboard/components/dashboard-home";
import { getCurrentUser } from "@/lib/dashboard/current-user";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  return <DashboardHome name={user.name} />;
}
