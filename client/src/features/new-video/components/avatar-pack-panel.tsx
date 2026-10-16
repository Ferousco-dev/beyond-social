"use client";

import Link from "next/link";
import { type Route } from "next";
import { useCallback, useEffect, useState } from "react";

import { listAssetGroups } from "@/features/asset-groups/actions";
import { type AssetGroup } from "@/lib/go-api/schemas";

function ready(group: AssetGroup): boolean {
  return group.slots.face !== "" && group.slots.voice !== "" && Boolean(group.face_consent_at) && Boolean(group.voice_consent_at);
}

/** Lets a creator begin a video from a reusable, consented avatar pack. */
export function AvatarPackPanel() {
  const [groups, setGroups] = useState<readonly AssetGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const result = await listAssetGroups();
    if (result.status === "ok") {
      setGroups(result.groups);
      return;
    }
    setError(result.status === "unconfigured" ? "The backend is not connected yet." : result.message);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (groups === null) return <p className="text-sm text-ink-soft">Loading your avatar packs…</p>;

  const complete = groups.filter(ready);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-ink-soft">Choose a saved avatar pack, then write the script and scene direction for this video.</p>
      {complete.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {complete.map((group) => (
            <li key={group.id}>
              <Link
                href={`/dashboard/avatar/new?group=${group.id}` as Route}
                className="block rounded-xl border border-hairline bg-paper p-3 transition-colors hover:bg-cloud/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="block text-sm font-semibold text-ink">{group.name}</span>
                <span className="mt-1 block text-xs text-ink-soft">Face and voice consent confirmed</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-hairline bg-cloud/40 p-4">
          <p className="text-sm font-medium text-ink">No complete avatar packs yet.</p>
          <p className="mt-1 text-sm text-ink-soft">Create one with a face image, voice sample, cloned voice, and your consent before generating a video.</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Link href={"/dashboard/avatar/new" as Route} className="inline-flex min-h-11 items-center rounded-[10px] bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90">
          {complete.length === 0 ? "Create an avatar" : "Create another avatar"}
        </Link>
        {groups.length > complete.length ? (
          <Link href={"/dashboard/assets" as Route} className="inline-flex min-h-11 items-center rounded-[10px] border border-hairline px-4 text-sm font-medium text-ink transition-colors hover:bg-cloud">
            Finish a saved pack
          </Link>
        ) : null}
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
