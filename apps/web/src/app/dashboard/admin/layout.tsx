import { notFound } from "next/navigation";
import { type ReactNode } from "react";

import { AdminNav } from "@/features/admin/components/admin-nav";
import { isAdmin } from "@/lib/dashboard/admin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // A non-admin gets a 404 rather than a 403: the console's existence is not
  // something a normal account needs to learn about. Gated once here so no
  // route under /dashboard/admin can forget the check.
  if (!(await isAdmin())) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="lg:flex lg:items-start lg:gap-10">
        <AdminNav />
        <div className="mt-6 min-w-0 flex-1 lg:mt-0">{children}</div>
      </div>
    </div>
  );
}
