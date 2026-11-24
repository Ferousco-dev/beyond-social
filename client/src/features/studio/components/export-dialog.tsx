"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Download, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";

import { PlatformLogo } from "@/components/brand/platform-logo";
import { Button } from "@/components/ui/button";
import { listConnections, startConnect } from "@/features/connections/actions";
import { type SocialStatus } from "@/lib/go-api/schemas";
import { cn } from "@/lib/utils";

import { detectZone, zonedTimeToUtc } from "../core/zone.ts";
import { suggestTimes, suggestionLabel, type LearnedSlot } from "../core/best-times.ts";
import { learnedSlots, writeCaption } from "../export-actions";
import { platformList, useExportFlow, type Destination, type Platform } from "../hooks/use-export-flow";
import { useStudio } from "../store/editor-store";
import { ZoneField } from "./zone-field";

const FIELD = "h-11 w-full rounded-lg border border-hairline bg-paper px-3 text-sm text-ink focus-visible:border-primary focus-visible:outline-none";
const MIN_LEAD_MS = 60_000;
/** Where the connections page sends someone back to after they connect an account. */
export const CONNECT_RETURN_KEY = "bs:connect-return";

type Accounts = { readonly status: "loading" } | { readonly status: "ready"; readonly list: readonly SocialStatus[] } | { readonly status: "error"; readonly message: string };

/** Where the finished video goes: this computer, or one or more connected accounts, now or later. */
export function ExportDialog() {
  const id = useId();
  const { state, start, cancel, reset } = useExportFlow();
  const title = useStudio((s) => s.title);
  const script = useStudio((s) => s.history.present.generation?.script ?? "");
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState<"download" | "post">("download");
  const [accounts, setAccounts] = useState<Accounts>({ status: "loading" });
  const [chosen, setChosen] = useState<readonly Platform[]>([]);
  // Each platform has its own words; the one being edited is the first chosen unless picked.
  const [words, setWords] = useState<Partial<Record<Platform, { title: string; caption: string }>>>({});
  const [editing, setEditing] = useState<Platform | null>(null);
  const [learned, setLearned] = useState<readonly LearnedSlot[]>([]);
  const [writing, setWriting] = useState(false);
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<Platform | null>(null);
  const [when, setWhen] = useState<"now" | "later">("now");
  const [local, setLocal] = useState("");
  const [zone, setZone] = useState(detectZone);

  // Which accounts can be posted to is known before anything renders, so nobody waits for a render that cannot post.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setAccounts({ status: "loading" });
    void listConnections().then((result) => {
      if (!active) return;
      if (!result.ok) return setAccounts({ status: "error", message: result.message });
      setAccounts({ status: "ready", list: result.list });
      const usable = result.list.filter((a) => a.connected && !a.needs_reconnect).map((a) => a.platform as Platform);
      setChosen((current) => (current.length > 0 ? current.filter((p) => usable.includes(p)) : usable.slice(0, 1)));
    });
    return () => {
      active = false;
    };
  }, [open]);

  const current: Platform | null = editing && chosen.includes(editing) ? editing : (chosen[0] ?? null);
  const currentWords = current ? (words[current] ?? { title: "", caption: "" }) : { title: "", caption: "" };
  const setCurrent = (patch: Partial<{ title: string; caption: string }>): void => {
    if (!current) return;
    setWords((all) => ({ ...all, [current]: { ...(all[current] ?? { title: "", caption: "" }), ...patch } }));
  };

  // The account's own best hours, learned from what it posted before, for the first account chosen.
  useEffect(() => {
    const first = chosen[0];
    if (!open || !first) return;
    let active = true;
    void learnedSlots(first).then((slots) => {
      if (active) setLearned(slots);
    });
    return () => {
      active = false;
    };
  }, [open, chosen]);
  const now = new Date();
  const suggestions = useMemo(() => suggestTimes(chosen, zone, new Date(), learned), [chosen, zone, learned]);

  const instant = useMemo(() => (when === "later" && local ? zonedTimeToUtc(local, zone) : null), [when, local, zone]);
  const busy = state.phase === "rendering" || state.phase === "uploading";
  const scheduleError = when === "later" && (!instant || instant.getTime() < Date.now() + MIN_LEAD_MS) ? "Pick a time at least a minute from now." : null;
  const posting = to === "post";
  const ready = !posting || (chosen.length > 0 && !scheduleError && !(when === "later" && !local));
  const label = !posting
    ? "Export"
    : chosen.length === 0
      ? "Choose an account"
      : `${when === "later" ? "Schedule for" : "Post to"} ${platformList(chosen)}`;

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (!ready || busy) return;
    const destination: Destination = posting ? { kind: "post", platforms: chosen, words, at: instant } : { kind: "download" };
    void start(destination);
  };

  const onOpenChange = (next: boolean): void => {
    if (!next && busy) return;
    setOpen(next);
    if (!next && state.phase !== "rendering") reset();
  };

  const toggle = (platform: Platform): void =>
    setChosen((current) => (current.includes(platform) ? current.filter((p) => p !== platform) : [...current, platform]));

  // Connecting leaves the editor for the platform; the connections page brings the person back here.
  const connect = async (platform: Platform): Promise<void> => {
    setConnecting(platform);
    try {
      window.sessionStorage.setItem(CONNECT_RETURN_KEY, window.location.pathname + window.location.search);
    } catch {
      // Without storage they land on Connections and come back from there.
    }
    const result = await startConnect(platform);
    if (result.status === "ok") window.location.assign(result.url);
    else {
      setConnecting(null);
      setAccounts((current) => (current.status === "ready" ? current : { status: "error", message: result.message }));
    }
  };

  const suggest = async (): Promise<void> => {
    setWriting(true);
    setCaptionError(null);
    const result = await writeCaption([title, script].filter(Boolean).join("\n\n"), chosen);
    setWriting(false);
    if (!result.ok) return setCaptionError(result.message);
    setWords((all) => {
      const next = { ...all };
      for (const platform of chosen) {
        const got = result.posts[platform];
        if (got) next[platform] = { title: got.title, caption: got.caption };
      }
      return next;
    });
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
          <Dialog.Description className="sr-only">Save it, or post it to your connected accounts.</Dialog.Description>

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
              <fieldset disabled={busy} className="grid grid-cols-2 gap-2">
                <legend className="sr-only">Destination</legend>
                {([["download", "Save to computer"], ["post", "Post"]] as const).map(([value, text]) => (
                  <label key={value} className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-hairline px-3 text-sm text-ink has-[:checked]:border-primary has-[:checked]:bg-cloud">
                    <input type="radio" name={`${id}-to`} value={value} checked={to === value} onChange={() => setTo(value)} className="sr-only" />
                    {text}
                  </label>
                ))}
              </fieldset>

              {posting ? (
                <fieldset disabled={busy} className="space-y-4">
                  <div>
                    <span className="mb-1.5 block text-xs text-ink-soft">Accounts</span>
                    {accounts.status === "loading" ? (
                      <div className="space-y-2" aria-busy>
                        {[0, 1, 2].map((row) => (
                          <div key={row} className="h-12 animate-pulse rounded-lg bg-cloud" />
                        ))}
                      </div>
                    ) : accounts.status === "error" ? (
                      <p role="alert" className="text-sm text-destructive">
                        {accounts.message}
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {accounts.list.map((account) => {
                          const platform = account.platform as Platform;
                          const usable = account.connected && !account.needs_reconnect;
                          const picked = chosen.includes(platform);
                          return (
                            <li key={platform}>
                              {usable ? (
                                <button
                                  type="button"
                                  aria-pressed={picked}
                                  onClick={() => toggle(platform)}
                                  className={cn(
                                    "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg border px-3 text-left text-sm transition-colors",
                                    picked ? "border-primary bg-cloud" : "border-hairline hover:bg-cloud/60",
                                  )}
                                >
                                  <PlatformLogo platform={platform} colour={platform !== "tiktok"} className={platform === "tiktok" ? "text-ink" : undefined} />
                                  <span className="min-w-0 flex-1">
                                    <span className="block font-medium text-ink">{account.label}</span>
                                    <span className="block truncate text-xs text-ink-soft">{account.account_name ?? "Connected"}</span>
                                  </span>
                                  <span className={cn("grid size-5 place-items-center rounded-md border", picked ? "border-primary bg-primary text-primary-foreground" : "border-hairline")}>
                                    {picked ? <Check className="size-3.5" aria-hidden /> : null}
                                  </span>
                                </button>
                              ) : (
                                <div className="flex min-h-12 items-center gap-3 rounded-lg border border-dashed border-hairline px-3 text-sm">
                                  <PlatformLogo platform={platform} colour={false} className="text-ink-soft" />
                                  <span className="min-w-0 flex-1 text-ink-soft">{account.label}</span>
                                  {account.available ? (
                                    <button
                                      type="button"
                                      onClick={() => void connect(platform)}
                                      disabled={connecting !== null}
                                      className="cursor-pointer text-sm font-medium text-primary hover:underline disabled:opacity-60"
                                    >
                                      {connecting === platform ? "Opening…" : account.needs_reconnect ? "Sign in again" : "Connect"}
                                    </button>
                                  ) : (
                                    <span className="text-xs text-ink-soft">Not available yet</span>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div>
                    {chosen.length > 1 ? (
                      <div role="tablist" aria-label="Caption for" className="mb-2 flex gap-1">
                        {chosen.map((platform) => (
                          <button
                            key={platform}
                            type="button"
                            role="tab"
                            aria-selected={current === platform}
                            onClick={() => setEditing(platform)}
                            className={cn(
                              "h-8 cursor-pointer rounded-lg px-3 text-xs font-medium transition-colors",
                              current === platform ? "bg-ink text-paper" : "text-ink-soft hover:bg-cloud hover:text-ink",
                            )}
                          >
                            {platformList([platform])}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {current === "youtube" ? (
                      <div className="mb-3">
                        <label htmlFor={`${id}-title`} className="mb-1 block text-xs text-ink-soft">
                          YouTube title
                        </label>
                        <input
                          id={`${id}-title`}
                          value={currentWords.title}
                          maxLength={100}
                          placeholder={title}
                          onChange={(e) => setCurrent({ title: e.target.value })}
                          className={FIELD}
                        />
                      </div>
                    ) : null}
                    <div className="mb-1.5 flex items-center justify-between">
                      <label htmlFor={`${id}-caption`} className="text-xs text-ink-soft">
                        {current === "youtube" ? "Description" : "Caption"}
                      </label>
                      <button
                        type="button"
                        onClick={() => void suggest()}
                        disabled={writing}
                        className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-60"
                      >
                        {writing ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />}
                        {writing ? "Writing…" : currentWords.caption.trim() ? "Write again" : "Write it for me"}
                      </button>
                    </div>
                    <textarea
                      id={`${id}-caption`}
                      value={currentWords.caption}
                      rows={4}
                      maxLength={2200}
                      disabled={!current}
                      onChange={(e) => setCurrent({ caption: e.target.value })}
                      className="field-sizing-content block min-h-24 w-full resize-none rounded-lg border border-hairline bg-paper p-3 text-sm text-ink focus-visible:border-primary focus-visible:outline-none"
                    />
                    {captionError ? <p className="mt-1 text-xs text-destructive">{captionError}</p> : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="When to post">
                    {([["now", "Now"], ["later", "Schedule"]] as const).map(([value, text]) => (
                      <label key={value} className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-hairline text-sm text-ink has-[:checked]:border-primary has-[:checked]:bg-cloud">
                        <input type="radio" name={`${id}-when`} value={value} checked={when === value} onChange={() => setWhen(value)} className="sr-only" />
                        {text}
                      </label>
                    ))}
                  </div>
                  {when === "later" ? (
                    <>
                      {suggestions.length > 0 ? (
                        <div>
                          <span className="mb-1.5 block text-xs text-ink-soft">
                            {suggestions[0]?.source === "history" ? "Your best times" : "Good times to post"}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {suggestions.map((s) => (
                              <button
                                key={s.local}
                                type="button"
                                aria-pressed={local === s.local}
                                onClick={() => setLocal(s.local)}
                                className={cn(
                                  "h-9 cursor-pointer rounded-full border px-3.5 text-sm transition-colors",
                                  local === s.local ? "border-primary bg-primary text-primary-foreground" : "border-hairline text-ink hover:bg-cloud",
                                )}
                              >
                                {suggestionLabel(s, zone, now)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <div>
                        <label htmlFor={`${id}-at`} className="mb-1 block text-xs text-ink-soft">
                          Date and time
                        </label>
                        <input id={`${id}-at`} type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} className={FIELD} />
                      </div>
                      <ZoneField id={`${id}-zone`} zone={zone} onChange={setZone} label="Where your audience is (time zone)" />
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
                    <Button type="submit" size="sm" disabled={!ready}>
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
