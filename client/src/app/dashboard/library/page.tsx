import { type Metadata } from "next";
import { type ReactNode } from "react";

import { LibraryCard } from "@/features/library/library-card";
import { goApi } from "@/lib/go-api/client";
import { libraryResponse } from "@/lib/go-api/schemas";

export const metadata: Metadata = { title: "Library" };
export const dynamic = "force-dynamic";

export default async function LibraryPage(): Promise<ReactNode> {
  const result = await goApi("/api/v1/library?limit=60", libraryResponse);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Library</h1>
      <p className="mt-1 text-sm text-ink-soft">Every video you have made. Play it, download it, or post it.</p>

      {!result.ok ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {result.message}
        </p>
      ) : result.data.data.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">Nothing here yet. Videos you make in chat appear here when they finish.</p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.data.data.map((item) => (
            <LibraryCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
