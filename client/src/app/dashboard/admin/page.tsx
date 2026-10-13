import { type Route } from "next";
import { redirect } from "next/navigation";

export default function AdminIndexPage(): never {
  redirect("/dashboard/admin/setup" as Route);
}
