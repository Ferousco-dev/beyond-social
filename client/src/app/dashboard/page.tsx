import { redirect } from "next/navigation";

/** Signing in lands on New Video, where creation starts. Discover is one click away in the sidebar. */
export default function DashboardPage(): never {
  redirect("/dashboard/new");
}
