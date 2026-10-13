"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Download, Loader2 } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";

import { detectZone, zonedTimeToUtc } from "../core/zone.ts";
import { useExportFlow, type Destination, type Platform } from "../hooks/use-export-flow";
import { ZoneField } from "./zone-field";

const PLATFORMS: ReadonlyArray<{ value: Platform; label: string }> = [
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
];

const FIELD = "h-11 w-full rounded-lg border border-hairline bg-paper px-3 text-sm text-ink focus-visible:border-primary focus-visible:outline-none";
const MIN_LEAD_MS = 60_000;

/** Where the finished video goes: this computer, or a connected account now or later. */
export function ExportDialog() {
  const id = useId();
  const { state, start, cancel, reset } = useExportFlow();
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState<"download" | "post">("download");
  const [platform, setPlatform] = useState<Platform>("youtube");
  const [caption, setCaption] = useState("");
  const [when, setWhen] = useState<"now" | "later">("now");
  const [local, setLocal] = useState("");
  const [zone, setZone] = useState(detectZone);

  const instant = useMemo(() => (when === "later" && local ? zonedTimeToUtc(local, zone) : null), [when, local, zone]);
  const busy = state.phase === "rendering" || state.phase === "uploading";
  const scheduleError = when === "later" && (!instant || instant.getTime() < Date.now() + MIN_LEAD_MS) ? "Pick a time at least a minute from now." : null;
  const posting = to === "post";
  const ready = !posting || !scheduleError;
  const label = !posting ? "Export" : when === "later" ? "Schedule post" : "Post now";

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (!ready || busy) return;
    const destination: Destination = posting ? { kind: "post", platform, caption, at: instant } : { kind: "download" };
    void start(destination);
  };

  const onOpenChange = (next: boolean): void => {
    if (!next && busy) return;
    setOpen(next);
    if (!next && state.phase !== "rendering") reset();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <Button size="sm">
          <Download aria-hidden />
          Export
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-hairline bg-paper p-5 shadow-xl focus:outline-none">
          <Dialog.Title className="text-base font-semibold text-ink">Export your video</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-ink-soft">Save it, or send it to one of your connected accounts.</Dialog.Description>

          {state.phase === "done" ? (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-ink">{state.message}</p>
              <div className="flex gap-2">
                {posting ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href="/dashboard/schedule">Open Schedule</Link>
                  </Button>
                ) : null}
                <Button size="sm" onClick={() => onOpenChange(false)}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-4">
              <fieldset disabled={busy} className="space-y-2">
                <legend className="sr-only">Destination</legend>
                {([["download", "Save to this computer"], ["post", "Post to a social account"]] as const).map(([value, text]) => (
                  <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-hairline px-3 text-sm text-ink has-[:checked]:border-primary has-[:checked]:bg-cloud">
                    <input type="radio" name={`${id}-to`} value={value} checked={to === value} onChange={() => setTo(value)} className="accent-primary" />
                    {text}
                  </label>
                ))}
              </fieldset>

              {posting ? (
                <fieldset disabled={busy} className="space-y-3">
                  <div>
                    <label htmlFor={`${id}-platform`} className="mb-1 block text-xs text-ink-soft">
                      Platform
                    </label>
                    <select id={`${id}-platform`} value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} className={FIELD}>
                      {PLATFORMS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`${id}-caption`} className="mb-1 block text-xs text-ink-soft">
                      Caption
                    </label>
                    <textarea id={`${id}-caption`} value={caption} rows={3} maxLength={2200} onChange={(e) => setCaption(e.target.value)} className="block w-full resize-none rounded-lg border border-hairline bg-paper p-3 text-sm text-ink focus-visible:border-primary focus-visible:outline-none" />
                  </div>
                  <div className="flex gap-2" role="radiogroup" aria-label="When to post">
                    {([["now", "Now"], ["later", "Schedule"]] as const).map(([value, text]) => (
                      <label key={value} className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg border border-hairline text-sm text-ink has-[:checked]:border-primary has-[:checked]:bg-cloud">
                        <input type="radio" name={`${id}-when`} value={value} checked={when === value} onChange={() => setWhen(value)} className="sr-only" />
                        {text}
                      </label>
                    ))}
                  </div>
                  {when === "later" ? (
                    <>
                      <div>
                        <label htmlFor={`${id}-at`} className="mb-1 block text-xs text-ink-soft">
                          Date and time
                        </label>
                        <input id={`${id}-at`} type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} className={FIELD} />
                      </div>
                      <ZoneField id={`${id}-zone`} zone={zone} onChange={setZone} />
                      {instant && !scheduleError ? (
                        <p className="text-xs text-ink-soft">
                          Posts at {local.replace("T", " ")} in {zone.replace(/_/g, " ")} ({instant.toISOString().slice(0, 16).replace("T", " ")} UTC).
                        </p>
                      ) : null}
                      {scheduleError && local ? <p className="text-xs text-destructive">{scheduleError}</p> : null}
                    </>
                  ) : null}
                </fieldset>
              ) : null}

              {state.phase === "failed" ? (
                <p role="alert" className="text-sm text-destructive">
                  {state.message}
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                {busy ? (
                  <Button type="button" variant="outline" size="sm" onClick={cancel}>
                    {state.phase === "rendering" ? `${Math.round(state.progress * 100)}% · Cancel` : "Uploading…"}
                  </Button>
                ) : (
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                      Close
                    </Button>
                    <Button type="submit" size="sm" disabled={!ready || (when === "later" && !local)}>
                      {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
                      {label}
                    </Button>
                  </>
                )}
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
