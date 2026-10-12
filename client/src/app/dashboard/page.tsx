import { redirect } from "next/navigation";

/** The composer that lived here is being moved to the new backend; Discover is the start for now. */
export default function DashboardPage(): never {
  redirect("/dashboard/trends");
}
