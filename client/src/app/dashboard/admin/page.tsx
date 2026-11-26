import { ArrowRight } from "lucide-react";
import { type Metadata, type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { EmptyArt } from "@/components/ui/empty-art";
import { getCurrentUser } from "@/lib/dashboard/current-user";

export const metadata: Metadata = { title: "Admin" };

/** The admin console's front page: a welcome, nothing to do. The sections are in the rail. */
export default async function AdminHomePage(): Promise<ReactNode> {
  const user = await getCurrentUser();
  const first = (user.name ?? "").trim().split(/\s+/u)[0] ?? "";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <EmptyArt name="admin" className="max-w-[280px]" />
      <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink">Welcome to the admin dashboard{first ? `, ${first}` : ""}</h1>
      <p className="mt-2 text-sm text-ink-soft">Start by adding the keys for the services Beyond Social uses.</p>
      <Link href={"/dashboard/admin/providers" as Route} className="btn btn-primary btn-md mt-6">
        Get started
        <ArrowRight aria-hidden />
      </Link>
    </div>
  );
}
