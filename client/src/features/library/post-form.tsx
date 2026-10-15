"use client";

import Link from "next/link";
import { type Route } from "next";
import { useId, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

import { postFromLibrary } from "./actions";

const PLATFORMS = [
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
] as const;

type Platform = (typeof PLATFORMS)[number]["value"];

const FIELD =
  "h-11 w-full rounded-lg border border-hairline bg-paper px-3 text-sm text-ink focus-visible:border-primary focus-visible:outline-none";

function localDateTimeMin(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function PostForm({ jobId, onDone }: { readonly jobId: string; readonly onDone: () => void }): ReactNode {
  const id = useId();
  // Keep a key for retries of unchanged input; edits start a new attempt.
  const key = useRef(crypto.randomUUID());
  const [platform, setPlatform] = useState<Platform>("youtube");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "private">("public");
  const [when, setWhen] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (when && new Date(when).getTime() < Date.now()) {
      setError("Choose a future time, or leave the schedule empty to publish as soon as the video is ready.");
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await postFromLibrary({
        jobId,
        platform,
        title,
        caption,
        visibility,
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
        <select id={`${id}-platform`} value={platform}         onChange={(e) => {
          setPlatform(e.target.value as Platform);
          key.current = crypto.randomUUID();
        }} className={FIELD}>
          {PLATFORMS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-title`} className="mb-1 block text-xs text-ink-soft">
          Title (optional, up to 100 characters)
        </label>
        <input
          id={`${id}-title`}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            key.current = crypto.randomUUID();
          }}
          maxLength={100}
          className={FIELD}
        />
      </div>
      <div>
        <label htmlFor={`${id}-caption`} className="mb-1 block text-xs text-ink-soft">
          Caption
        </label>
        <textarea
          id={`${id}-caption`}
          value={caption}
          onChange={(e) => {
            setCaption(e.target.value);
            key.current = crypto.randomUUID();
          }}
          maxLength={2200}
          rows={3}
          className={`${FIELD} h-auto py-2`}
        />
      </div>
      <div>
        <label htmlFor={`${id}-visibility`} className="mb-1 block text-xs text-ink-soft">
          Visibility
        </label>
        <select
          id={`${id}-visibility`}
          value={visibility}
          onChange={(e) => {
            setVisibility(e.target.value as "public" | "unlisted" | "private");
            key.current = crypto.randomUUID();
          }}
          className={FIELD}
        >
          <option value="public">Public</option>
          <option value="unlisted">Unlisted</option>
          <option value="private">Private</option>
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-when`} className="mb-1 block text-xs text-ink-soft">
          When (leave empty to post now)
        </label>
        <input
          id={`${id}-when`}
          type="datetime-local"
          min={localDateTimeMin()}
          value={when}
          onChange={(e) => {
            setWhen(e.target.value);
            key.current = crypto.randomUUID();
          }}
          className={FIELD}
        />
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
