import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode } from "react";

import { getAssetGroup } from "@/features/asset-groups/actions";
import { GroupDetailView } from "@/features/asset-groups/components/group-detail";

export const metadata: Metadata = { title: "Asset group" };
export const dynamic = "force-dynamic";

export default async function AssetGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<ReactNode> {
  const { id } = await params;
  const result = await getAssetGroup(id);
  if (result.status !== "ok") notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <Link
        href="/dashboard/assets"
        className="text-sm text-ink-soft underline underline-offset-2 hover:text-ink"
      >
        All groups
      </Link>
      <div className="mt-4">
        <GroupDetailView initial={result.group} />
      </div>
    </div>
  );
}
