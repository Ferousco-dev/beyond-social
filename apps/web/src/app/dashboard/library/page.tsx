import { type Metadata } from "next";

import { LibraryGrid } from "@/features/library/components/library-grid";
import { getLibraryItems } from "@/features/library/queries";

export const metadata: Metadata = { title: "Library" };
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const page = await getLibraryItems();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Library</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-soft">
        Everything you have sent and generated, newest first. Open any item to go back to the chat
        it belongs to.
      </p>

      <LibraryGrid initialItems={page.items} initialCursor={page.nextCursor} />
    </div>
  );
}
