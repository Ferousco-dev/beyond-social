import { redirect } from "next/navigation";

/** The console has no landing page of its own; overview is the entry point. */
export default function AdminRootPage(): never {
  redirect("/overview");
}
