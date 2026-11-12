"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type Route } from "next";
import { useCallback, useEffect, useState } from "react";

import { listAssetGroups } from "@/features/asset-groups/actions";
import { resolveMediaUrls } from "@/features/studio/media-actions";
import { type AssetGroup } from "@/lib/go-api/schemas";

function ready(group: AssetGroup): boolean {
  return group.slots.face !== "" && group.slots.voice !== "" && Boolean(group.face_consent_at) && Boolean(group.voice_consent_at);
}

export const AVATAR_PACK_KEY = "bs:avatar-pack";

/** Lets a creator begin a video from a reusable, consented avatar pack. */
export function AvatarPackPanel() {
  const router = useRouter();
  const [groups, setGroups] = useState<readonly AssetGroup[] | null>(null);
  const [faces, setFaces] = useState<Readonly<Record<string, string>>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const result = await listAssetGroups();
    if (result.status === "ok") {
      setGroups(result.groups);
      // One request for every face; the circles show the default picture until it arrives.
      const ids = result.groups.map((g) => g.slots.face).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
      if (ids.length > 0) {
        // A failed or slow photo request leaves the default picture in place; it never blocks the packs.
        try {
          const links = await resolveMediaUrls(ids);
          setFaces(Object.fromEntries(Object.entries(links).map(([id, link]) => [id, link.url])));
        } catch {
          /* default pictures stay */
        }
      }
      return;
    }
    setError(result.status === "unconfigured" ? "The service is not available right now. Try again in a few minutes." : result.message);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function choose(group: AssetGroup): void {
    try {
      for (const key of ["bs:generate-draft", "bs:approved-script", "bs:own-idea", "bs:quick-start"]) window.sessionStorage.removeItem(key);
      window.sessionStorage.setItem(AVATAR_PACK_KEY, JSON.stringify(group.slots));
    } catch {
      setError("This browser could not save your choice. Check its storage settings and try again.");
      return;
    }
    router.push("/dashboard/videos/new" as Route);
  }

  if (groups === null) return <p className="text-sm text-ink-soft">Loading your avatar packs…</p>;

  const complete = groups.filter(ready);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-ink-soft">Choose a saved avatar pack, then write the script and scene direction for this video.</p>
      {complete.length > 0 ? (
        <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4">
          {complete.map((group) => {
            const face = faces[group.slots.face];
            return (
              <li key={group.id}>
                <button
                  type="button"
                  onClick={() => choose(group)}
                                    className="group flex flex-col items-center gap-2 rounded-xl p-1 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="relative flex size-20 items-center justify-center overflow-hidden rounded-full bg-cloud ring-2 ring-hairline transition group-hover:ring-primary">
                    {face ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={face} alt="" onError={(event) => (event.currentTarget.style.display = "none")} className="size-full object-cover" />
                    ) : (
                      <UserRound className="size-9 text-ink-soft" aria-hidden />
                    )}
                  </span>
                  <span className="w-full truncate text-sm font-medium text-ink">{group.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-xl border border-hairline bg-cloud/40 p-4">
          <p className="text-sm font-medium text-ink">No complete avatar packs yet.</p>
          <p className="mt-1 text-sm text-ink-soft">Create one with a face image, a voice recording, and your consent before generating a video.</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Link href={"/dashboard/assets" as Route} className="inline-flex min-h-11 items-center rounded-[10px] bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90">
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
