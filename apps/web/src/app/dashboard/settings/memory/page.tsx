import { type Metadata } from "next";

import { MemoryList } from "@/features/memory/components/memory-list";
import { getMemoryLibrary } from "@/lib/memory/library";

export const metadata: Metadata = { title: "Memory" };
export const dynamic = "force-dynamic";

/**
 * What the product has remembered.
 *
 * Memory that cannot be inspected cannot be corrected, and a wrong claim here
 * quietly changes every video from now on. It is also the hardest kind of bug to
 * report: nobody can guess that the reason their videos went vertical is a
 * sentence recorded three weeks ago.
 */
export default async function MemoryPage() {
  const library = await getMemoryLibrary();

  return (
    <section className="mt-6 lg:mt-8">
      <p className="text-sm text-ink-soft">
        Standing preferences and facts noted while you work, so you do not have to repeat yourself.
        The details of any one video are not kept. Remove anything here and it stops being used.
      </p>

      <MemoryList library={library} />
    </section>
  );
}
