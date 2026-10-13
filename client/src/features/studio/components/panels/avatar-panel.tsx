"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { listSpeakingAvatars, type AvatarChoice } from "../../avatar-actions";
import { useAvatarVideo } from "../../hooks/use-avatar-video";

const MAX_SCRIPT = 600;

function Preview({ avatar }: { avatar: AvatarChoice }) {
  return avatar.preview_image_url ? (
    // Provider thumbnails are small and already hosted, so a plain img is enough here.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatar.preview_image_url} alt="" className="size-10 shrink-0 rounded-md object-cover" />
  ) : (
    <span className="size-10 shrink-0 rounded-md bg-cloud" aria-hidden />
  );
}

/** Pick one of your trained avatars, write what it says, and drop the video on the timeline. */
export function AvatarPanel() {
  const [avatars, setAvatars] = useState<readonly AvatarChoice[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [script, setScript] = useState("");
  const { state, make, reset } = useAvatarVideo();

  useEffect(() => {
    let live = true;
    void listSpeakingAvatars().then((list) => {
      if (!live) return;
      setAvatars(list);
      setPicked((current) => current ?? list.find((a) => a.is_default)?.id ?? list[0]?.id ?? null);
    });
    return () => {
      live = false;
    };
  }, []);

  if (avatars === null) return <p className="p-3 text-sm text-ink-soft">Loading your avatars…</p>;
  if (avatars.length === 0) {
    return (
      <div className="p-3 text-sm text-ink-soft">
        <p>You have no avatar that can speak yet.</p>
        <Link href="/dashboard/assets" className="mt-2 inline-block font-medium text-ink underline underline-offset-2">
          Train an avatar
        </Link>
      </div>
    );
  }

  const working = state.phase === "working";
  return (
    <div className="space-y-3 p-3">
      <ul aria-label="Your avatars" className="space-y-1.5">
        {avatars.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              aria-pressed={picked === a.id}
              disabled={working}
              onClick={() => setPicked(a.id)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-hairline p-2 text-left text-sm text-ink transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60",
                picked === a.id && "border-primary bg-cloud",
              )}
            >
              <Preview avatar={a} />
              <span className="min-w-0 flex-1 truncate">{a.name}</span>
            </button>
          </li>
        ))}
      </ul>

      <div>
        <label htmlFor="avatar-script" className="text-xs text-ink-soft">
          What should it say?
        </label>
        <textarea
          id="avatar-script"
          value={script}
          rows={4}
          maxLength={MAX_SCRIPT}
          disabled={working}
          onChange={(e) => {
            setScript(e.target.value);
            if (state.phase !== "idle" && state.phase !== "working") reset();
          }}
          className="mt-1 block w-full resize-none rounded-lg border border-hairline bg-canvas p-2.5 text-sm text-ink focus-visible:border-primary focus-visible:outline-none disabled:opacity-60"
        />
        <p className="mt-1 text-[11px] text-ink-soft tabular-nums">
          {script.length} / {MAX_SCRIPT}. Costs credits, returned if it fails.
        </p>
      </div>

      <Button size="sm" className="w-full" disabled={working || !picked || script.trim() === ""} onClick={() => picked && void make(picked, script.trim())}>
        {working ? "Making your video…" : "Add to timeline"}
      </Button>
      {state.phase === "working" ? <p className="text-xs text-ink-soft">This usually takes a few minutes. You can keep editing.</p> : null}
      {state.phase === "done" ? <p className="text-xs text-ink-soft">Added to the end of your video.</p> : null}
      {state.phase === "failed" ? (
        <p role="alert" className="text-xs text-destructive">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
