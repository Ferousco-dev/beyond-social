import { type Metadata } from "next";

import { MemoryManager } from "@/features/memory/components/memory-manager";
import { goApi } from "@/lib/go-api/client";
import { memoryResponse } from "@/lib/go-api/schemas";

export const metadata: Metadata = { title: "Memory" };
export const dynamic = "force-dynamic";

export default async function MemorySettingsPage() {
  const result = await goApi("/api/v1/memory", memoryResponse);
  if (!result.ok) {
    return (
      <p role="alert" className="mt-6 text-sm text-destructive">
        {result.message}
      </p>
    );
  }
  const { enabled, facts, limit } = result.data.data;
  return (
    <section className="mt-6 lg:mt-8">
      <MemoryManager enabled={enabled} facts={facts} limit={limit} />
    </section>
  );
}
