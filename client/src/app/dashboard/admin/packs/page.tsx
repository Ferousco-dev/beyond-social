import { type Metadata } from "next";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { PackForm } from "@/features/admin-console/components/pack-form";
import { goApi } from "@/lib/go-api/client";
import { packsResponse } from "@/lib/go-api/schemas";

export const metadata: Metadata = { title: "Admin · Credit packs" };

export default async function AdminPacksPage(): Promise<ReactNode> {
  const result = await goApi("/api/v1/admin/packs", packsResponse);
  if (!result.ok) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {result.message}
      </p>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Credit packs</h1>
      <p className="mt-1 text-sm text-ink-soft">
        What people can buy. Prices are in US dollars. Turn a pack off to stop selling it without losing past purchases. Payments need the Stripe keys on the{" "}
        <Link href={"/dashboard/admin/providers" as Route} className="text-ink underline">
          provider keys
        </Link>{" "}
        page.
      </p>
      <ul className="mt-6 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
        {result.data.data.map((pack) => (
          <PackForm key={pack.id} pack={pack} />
        ))}
        <PackForm pack={null} />
      </ul>
    </div>
  );
}
