"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Clock, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLATFORMS, RECOMMENDED_TIMES } from "@/lib/publish/data";

interface PublishDialogProps {
  children: React.ReactNode;
  videoTitle: string;
}

export function PublishDialog({ children, videoTitle }: PublishDialogProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [platformSchedules, setPlatformSchedules] = useState<
    Record<string, { caption: string; hashtags: string; scheduledTime: string }>
  >({});

  function togglePlatform(platformId: string) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platformId)) {
        next.delete(platformId);
        setPlatformSchedules((schedules) => {
          const updated = { ...schedules };
          delete updated[platformId];
          return updated;
        });
      } else {
        next.add(platformId);
        const platform = PLATFORMS.find((p) => p.id === platformId);
        if (platform) {
          const times = RECOMMENDED_TIMES[platformId] || [];
          setPlatformSchedules((schedules) => ({
            ...schedules,
            [platformId]: {
              caption: "",
              hashtags: "",
              scheduledTime: times[0]?.time || "",
            },
          }));
        }
      }
      return next;
    });
  }

  function updatePlatformSchedule(
    platformId: string,
    field: "caption" | "hashtags" | "scheduledTime",
    value: string,
  ) {
    setPlatformSchedules((prev) => ({
      ...prev,
      [platformId]: {
        caption: prev[platformId]?.caption ?? "",
        hashtags: prev[platformId]?.hashtags ?? "",
        scheduledTime: prev[platformId]?.scheduledTime ?? "",
        [field]: value,
      },
    }));
  }

  const selectedPlatformArray = PLATFORMS.filter((p) => selectedPlatforms.has(p.id));

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex h-[600px] max-h-[85vh] w-[calc(100vw-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-hairline bg-paper text-ink shadow-card focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <Dialog.Title className="sr-only">Publish video</Dialog.Title>
          <Dialog.Description className="sr-only">
            Schedule your video across social platforms
          </Dialog.Description>

          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
              <div>
                <h2 className="text-base font-semibold">Publish video</h2>
                <p className="text-sm text-ink-soft">{videoTitle}</p>
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
                    const isSelected = selectedPlatforms.has(platform.id);
                    return (
                      <button
                        key={platform.id}
                        type="button"
                        onClick={() => togglePlatform(platform.id)}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                          isSelected
                            ? "border-primary bg-primary/5 text-ink"
                            : "border-hairline text-ink-soft hover:border-hairline hover:bg-cloud",
                        )}
                      >
                        <div
                          className="flex size-8 items-center justify-center rounded-md"
                          style={{ backgroundColor: isSelected ? platform.color : undefined }}
                        >
                          <platform.icon
                            className={cn("size-4", isSelected ? "text-white" : "text-ink-soft")}
                          />
                        </div>
                        <span className="flex-1 text-left">{platform.name}</span>
                        {isSelected && <Check className="size-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                {selectedPlatformArray.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <Clock className="size-8 text-ink-soft" />
                    <p className="mt-3 text-sm font-medium text-ink">No platforms selected</p>
                    <p className="mt-1 max-w-xs text-sm text-ink-soft">
                      Select at least one platform to schedule your video
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex flex-col gap-6">
                      {selectedPlatformArray.map((platform) => {
                        const schedule = platformSchedules[platform.id];
                        const times = RECOMMENDED_TIMES[platform.id] || [];
                        return (
                          <div
                            key={platform.id}
                            className="rounded-xl border border-hairline bg-cloud p-4"
                          >
                            <div className="flex items-center gap-2">
                              <platform.icon className="size-5" style={{ color: platform.color }} />
                              <h3 className="text-sm font-semibold">{platform.name}</h3>
                            </div>

                            <div className="mt-4 space-y-4">
                              <div>
                                <label
                                  htmlFor={`time-${platform.id}`}
                                  className="block text-xs font-medium text-ink-soft"
                                >
                                  Schedule time
                                </label>
                                <select
                                  id={`time-${platform.id}`}
                                  value={schedule?.scheduledTime || ""}
                                  onChange={(e) =>
                                    updatePlatformSchedule(
                                      platform.id,
                                      "scheduledTime",
                                      e.target.value,
                                    )
                                  }
                                  className="mt-1.5 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                  {times.map((time) => (
                                    <option key={time.time} value={time.time}>
                                      {time.time} - {time.label}
                                    </option>
                                  ))}
                                </select>
                                <p className="mt-1 text-xs text-ink-soft">
                                  {times.find((t) => t.time === schedule?.scheduledTime)?.reason}
                                </p>
                              </div>

                              <div>
                                <label
                                  htmlFor={`caption-${platform.id}`}
                                  className="block text-xs font-medium text-ink-soft"
                                >
                                  Caption
                                </label>
                                <textarea
                                  id={`caption-${platform.id}`}
                                  value={schedule?.caption || ""}
                                  onChange={(e) =>
                                    updatePlatformSchedule(platform.id, "caption", e.target.value)
                                  }
                                  rows={3}
                                  placeholder="Add a caption for this platform"
                                  className="mt-1.5 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                />
                              </div>

                              <div>
                                <label
                                  htmlFor={`hashtags-${platform.id}`}
                                  className="block text-xs font-medium text-ink-soft"
                                >
                                  Hashtags
                                </label>
                                <input
                                  id={`hashtags-${platform.id}`}
                                  type="text"
                                  value={schedule?.hashtags || ""}
                                  onChange={(e) =>
                                    updatePlatformSchedule(platform.id, "hashtags", e.target.value)
                                  }
                                  placeholder="#fashion #trending"
                                  className="mt-1.5 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-hairline px-6 py-4">
              <p className="text-xs text-ink-soft">
                {selectedPlatformArray.length} platform
                {selectedPlatformArray.length !== 1 ? "s" : ""} selected
              </p>
              <div className="flex gap-2">
                <Dialog.Close asChild>
                  <Button variant="outline">Cancel</Button>
                </Dialog.Close>
                <Button disabled={selectedPlatformArray.length === 0}>
                  Schedule {selectedPlatformArray.length > 1 ? "all" : "video"}
                </Button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
