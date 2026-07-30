"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Clock, Loader2, Sparkles, X } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { writeCaptions } from "@/features/optimization/actions";
import { schedulePosts } from "@/features/publishing/actions";
import { suggestPostingTimes } from "@/lib/optimization/posting-times";
import { PLATFORMS } from "@/lib/publish/data";
import { cn } from "@/lib/utils";

import { PlatformScheduleCard, type PlatformScheduleValue } from "./platform-schedule-card";

export function PublishDialog({
  children,
  videoTitle,
  generationId,
  /** Platforms with credentials configured. Everything else is shown as unavailable. */
  availablePlatforms,
}: {
  children: ReactNode;
  videoTitle: string;
  /** Null while the video is still rendering: there is nothing to publish yet. */
  generationId: string | null;
  availablePlatforms: readonly string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [schedules, setSchedules] = useState<Record<string, PlatformScheduleValue>>({});
  const [writing, startWriting] = useTransition();
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [scheduling, startScheduling] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  /*
   * Stable for the life of this dialog, so every retry of the same submission
   * carries the same key. Generating it per click would defeat the point: the
   * case being protected against is the second click.
   */
  const [idempotencyKey] = useState(
    () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
  );

  function submit() {
    if (!generationId) return;
    setResult(null);
    startScheduling(async () => {
      const response = await schedulePosts({
        generationId,
        idempotencyKey,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        posts: active.map((platform) => ({
          platform: platform.id as "tiktok" | "instagram" | "facebook" | "youtube",
          caption: schedules[platform.id]?.caption ?? "",
          hashtags: schedules[platform.id]?.hashtags ?? "",
          scheduledLocal: schedules[platform.id]?.scheduledTime ?? "",
        })),
      });
      setResult(
        response.status === "ok"
          ? {
              ok: true,
              message: `Scheduled ${response.scheduled} post${response.scheduled === 1 ? "" : "s"}.`,
            }
          : { ok: false, message: response.message },
      );
    });
  }

  function togglePlatform(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSchedules((prev) => {
      if (prev[id]) {
        const rest = { ...prev };
        delete rest[id];
        return rest;
      }
      // Seed with the next recommended slot, which is a real future
      // datetime rather than a label, so it can be scheduled as-is.
      const time = suggestPostingTimes(id)[0]?.value ?? "";
      return { ...prev, [id]: { caption: "", hashtags: "", scheduledTime: time } };
    });
  }

  function updateSchedule(id: string, field: keyof PlatformScheduleValue, value: string) {
    setSchedules((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { caption: "", hashtags: "", scheduledTime: "" }), [field]: value },
    }));
  }

  /**
   * Fills every selected platform's caption and hashtags from the video's own
   * brief, adapted per platform.
   *
   * The generator existed and nothing called it, so the feature was written but
   * unreachable. Only selected platforms are filled, and anything already typed
   * is left alone: overwriting words someone wrote is not a convenience.
   */
  function generateCaptions() {
    setCaptionError(null);
    startWriting(async () => {
      const result = await writeCaptions({ brief: videoTitle });
      if (result.status === "error") {
        setCaptionError(result.message);
        return;
      }
      setSchedules((prev) => {
        const next = { ...prev };
        for (const id of selected) {
          const written = result.captions[id as keyof typeof result.captions];
          const current = next[id];
          if (!written || !current) continue;
          next[id] = {
            ...current,
            caption: current.caption.trim() === "" ? written.caption : current.caption,
            hashtags: current.hashtags.trim() === "" ? written.hashtags : current.hashtags,
          };
        }
        return next;
      });
    });
  }

  const active = PLATFORMS.filter((platform) => selected.has(platform.id));
  // A post with no time is not schedulable, and the server would refuse it. The
  // button says so instead of letting someone find out by pressing it.
  const everyTimeSet = active.every(
    (platform) => (schedules[platform.id]?.scheduledTime ?? "") !== "",
  );

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex h-[600px] max-h-[85vh] w-[calc(100vw-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-hairline bg-paper text-ink shadow-card focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold">Publish video</Dialog.Title>
              <Dialog.Description className="text-sm text-ink-soft">
                {videoTitle}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close publish dialog"
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cloud hover:text-ink"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-72 shrink-0 border-r border-hairline p-5">
              <p className="text-sm font-semibold">Select platforms</p>
              <p className="mt-1 text-xs text-ink-soft">Choose where to publish your video</p>
              <div className="mt-4 flex flex-col gap-2">
                {PLATFORMS.map((platform) => {
                  const isSelected = selected.has(platform.id);
                  // A platform with no credentials configured cannot be
                  // published to, so it says so here rather than accepting the
                  // selection and failing later, when nothing can be done about
                  // it.
                  const available = availablePlatforms.includes(platform.id);
                  return (
                    <button
                      key={platform.id}
                      type="button"
                      disabled={!available}
                      title={available ? undefined : `${platform.name} is not connected yet`}
                      onClick={() => togglePlatform(platform.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                        available ? "cursor-pointer" : "cursor-not-allowed opacity-50",
                        isSelected
                          ? "border-primary bg-primary/5 text-ink"
                          : "border-hairline text-ink-soft hover:bg-cloud",
                      )}
                    >
                      <span
                        className="flex size-8 items-center justify-center rounded-md"
                        style={{ backgroundColor: isSelected ? platform.color : undefined }}
                      >
                        <platform.icon
                          className={cn("size-4", isSelected ? "text-white" : "text-ink-soft")}
                        />
                      </span>
                      <span className="flex-1 text-left">{platform.name}</span>
                      {isSelected ? <Check className="size-4 text-primary" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-w-0 flex-1 overflow-y-auto">
              {active.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Clock className="size-8 text-ink-soft" />
                  <p className="mt-3 text-sm font-medium text-ink">No platforms selected</p>
                  <p className="mt-1 max-w-xs text-sm text-ink-soft">
                    Select at least one platform to schedule your video
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-6 p-6">
                  {/* Sits above the cards it fills, so the relationship between
                      the action and what it changes is visible. */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-ink-soft">
                      Write each caption yourself, or start from a draft per platform.
                    </p>
                    <button
                      type="button"
                      onClick={generateCaptions}
                      disabled={writing}
                      className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-hairline px-3.5 text-xs font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {writing ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Sparkles className="size-3.5" aria-hidden />
                      )}
                      {writing ? "Writing" : "Draft captions"}
                    </button>
                  </div>

                  {captionError ? (
                    <p role="status" className="text-xs text-destructive">
                      {captionError}
                    </p>
                  ) : null}

                  {active.map((platform) => (
                    <PlatformScheduleCard
                      key={platform.id}
                      platform={platform}
                      value={
                        schedules[platform.id] ?? { caption: "", hashtags: "", scheduledTime: "" }
                      }
                      onChange={(field, value) => updateSchedule(platform.id, field, value)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-hairline px-6 py-4">
            <p className={cn("text-xs", result && !result.ok ? "text-danger" : "text-ink-soft")}>
              {result
                ? result.message
                : !generationId
                  ? "The video is still rendering"
                  : active.length > 0 && !everyTimeSet
                    ? "Pick a time for every selected platform"
                    : `${active.length} platform${active.length === 1 ? "" : "s"} selected`}
            </p>
            <div className="flex gap-2">
              <Dialog.Close asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.Close>
              <Button
                onClick={submit}
                disabled={active.length === 0 || scheduling || !generationId || !everyTimeSet}
              >
                {scheduling ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Scheduling
                  </>
                ) : (
                  `Schedule ${active.length > 1 ? "all" : "video"}`
                )}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
