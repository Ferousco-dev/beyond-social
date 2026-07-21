"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Clock, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { PLATFORMS, RECOMMENDED_TIMES } from "@/lib/publish/data";
import { cn } from "@/lib/utils";

import { PlatformScheduleCard, type PlatformScheduleValue } from "./platform-schedule-card";

export function PublishDialog({
  children,
  videoTitle,
}: {
  children: ReactNode;
  videoTitle: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [schedules, setSchedules] = useState<Record<string, PlatformScheduleValue>>({});

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
      const time = RECOMMENDED_TIMES[id]?.[0]?.time ?? "";
      return { ...prev, [id]: { caption: "", hashtags: "", scheduledTime: time } };
    });
  }

  function updateSchedule(id: string, field: keyof PlatformScheduleValue, value: string) {
    setSchedules((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { caption: "", hashtags: "", scheduledTime: "" }), [field]: value },
    }));
  }

  const active = PLATFORMS.filter((platform) => selected.has(platform.id));

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
                  return (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => togglePlatform(platform.id)}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
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
            <p className="text-xs text-ink-soft">
              {active.length} platform{active.length === 1 ? "" : "s"} selected
            </p>
            <div className="flex gap-2">
              <Dialog.Close asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.Close>
              <Button disabled={active.length === 0}>
                Schedule {active.length > 1 ? "all" : "video"}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
