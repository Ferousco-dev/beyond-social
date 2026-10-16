"use client";

import Link from "next/link";
import { type Route } from "next";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { getInsightSlots } from "@/features/analytics/actions";

import { postFromLibrary } from "./actions";

const PLATFORMS = [
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
] as const;

type Platform = (typeof PLATFORMS)[number]["value"];

const FIELD =
  "h-11 w-full rounded-lg border border-hairline bg-paper px-3 text-sm text-ink focus-visible:border-primary focus-visible:outline-none";

export function PostForm({ jobId, onDone }: { readonly jobId: string; readonly onDone: () => void }): ReactNode {
  const id = useId();
  // One key per opened form, so a double press posts once.
  const key = useRef(crypto.randomUUID());
  const [platform, setPlatform] = useState<Platform>("youtube");
  const [caption, setCaption] = useState("");
  const [when, setWhen] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Best posting times learned from this account's own history. Nothing shows
  // until the account has enough published posts to learn from.
  useEffect(() => {
    let cancelled = false;
    setSuggestion(null);
    void getInsightSlots(platform).then((result) => {
      if (cancelled || result.status !== "ok" || result.slots.length === 0) return;
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const best = result.slots
        .slice(0, 2)
        .map((slot) => `${days[slot.weekday]} ${slot.hour}:00`)
        .join(" or ");
      setSuggestion(`This account does best around ${best}.`);
    });
    return () => {
      cancelled = true;
    };
  }, [platform]);

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    startTransition(async () => {
      setError(null);
      const result = await postFromLibrary({
        jobId,
        platform,
        caption,
        at: when ? new Date(when).toISOString() : undefined,
        idempotencyKey: key.current,
      });
      if (result.ok) setPosted(true);
      else setError(result.message);
    });
  };

  if (posted) {
    return (
      <p className="text-sm text-ink-soft">
        Queued.{" "}
        <Link href={"/dashboard/schedule" as Route} className="text-ink underline underline-offset-2">
          See it in Schedule
        </Link>
        .{" "}
        <button type="button" onClick={onDone} className="cursor-pointer text-ink underline underline-offset-2">
          Close
        </button>
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor={`${id}-platform`} className="mb-1 block text-xs text-ink-soft">
          Platform
        </label>
        <select id={`${id}-platform`} value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} className={FIELD}>
          {PLATFORMS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-caption`} className="mb-1 block text-xs text-ink-soft">
          Caption
        </label>
        <textarea
          id={`${id}-caption`}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={2200}
          rows={3}
          className={`${FIELD} h-auto py-2`}
        />
      </div>
      <div>
        <label htmlFor={`${id}-when`} className="mb-1 block text-xs text-ink-soft">
          When (leave empty to post now)
        </label>
        <input id={`${id}-when`} type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={FIELD} />
        {suggestion ? (
          <p className="mt-1 text-xs text-ink-soft">{suggestion}</p>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {when ? "Schedule" : "Post"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
