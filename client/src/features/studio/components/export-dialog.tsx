"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Download, LaptopMinimal, Lightbulb, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState, type FormEvent } from "react";

import { PlatformLogo } from "@/components/brand/platform-logo";
import { Button } from "@/components/ui/button";
import { listConnections, startConnect } from "@/features/connections/actions";
import { type SocialStatus } from "@/lib/go-api/schemas";
import { useLoad } from "@/lib/hooks/use-load";
import { cn } from "@/lib/utils";

import { detectZone, zonedTimeToUtc } from "../core/zone.ts";
import { suggestTimes, suggestionLabel, type LearnedSlot } from "../core/best-times.ts";
import { learnedSlots, writeCaption } from "../export-actions";
import { platformList, useExportFlow, type Destination, type Platform } from "../hooks/use-export-flow";
import { useStudio } from "../store/editor-store";
import { ZoneField } from "./zone-field";

const FIELD = "h-9 w-full rounded-lg border border-hairline bg-paper px-3 text-sm text-ink focus-visible:border-primary focus-visible:outline-none";
const MIN_LEAD_MS = 60_000;
/** Where the connections page sends someone back to after they connect an account. */
export const CONNECT_RETURN_KEY = "bs:connect-return";

type Accounts = { readonly status: "loading" } | { readonly status: "ready"; readonly list: readonly SocialStatus[] } | { readonly status: "error"; readonly message: string };

/** Posts the finished video to connected accounts, now or at the time our AI suggests. Save to laptop sits beside Close. */
export function ExportDialog() {
  const id = useId();
  const { state, start, cancel, reset } = useExportFlow();
  const title = useStudio((s) => s.title);
  const script = useStudio((s) => s.history.present.generation?.script ?? "");
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState<"download" | "post">("post");
  const [changingTime, setChangingTime] = useState(false);
  const [accounts, setAccounts] = useState<Accounts>({ status: "loading" });
  const [chosen, setChosen] = useState<readonly Platform[]>([]);
  // Each platform has its own words; the one being edited is the first chosen unless picked.
  const [words, setWords] = useState<Partial<Record<Platform, { title: string; caption: string }>>>({});
  const [editing, setEditing] = useState<Platform | null>(null);
  const [writing, setWriting] = useState(false);
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<Platform | null>(null);
  const [when, setWhen] = useState<"now" | "later">("now");
  const [local, setLocal] = useState("");
  const [zone, setZone] = useState(detectZone);

  /** Loads the accounts, picks the first usable one, and has our AI write its caption, so the person only checks it. */
  const loadAccounts = (): void => {
    setAccounts({ status: "loading" });
    void listConnections().then((result) => {
      if (!result.ok) return setAccounts({ status: "error", message: result.message });
      setAccounts({ status: "ready", list: result.list });
      const usable = result.list.filter((a) => a.connected && !a.needs_reconnect).map((a) => a.platform as Platform);
      const picked = chosen.length > 0 ? chosen.filter((p) => usable.includes(p)) : usable.slice(0, 1);
      setChosen(picked);
      if (picked.length > 0 && Object.keys(words).length === 0) void suggest(picked);
    });
  };

  const current: Platform | null = editing && chosen.includes(editing) ? editing : (chosen[0] ?? null);
  const currentWords = current ? (words[current] ?? { title: "", caption: "" }) : { title: "", caption: "" };
  const setCurrent = (patch: Partial<{ title: string; caption: string }>): void => {
    if (!current) return;
    setWords((all) => ({ ...all, [current]: { ...(all[current] ?? { title: "", caption: "" }), ...patch } }));
  };

  const firstChosen = chosen[0] ?? null;
  const slots = useLoad(() => learnedSlots(firstChosen ?? ""), open && firstChosen ? firstChosen : null);
  const now = new Date();
  const suggestions = useMemo(() => {
    const learned: readonly LearnedSlot[] = slots.status === "done" ? slots.value : [];
    return suggestTimes(chosen, zone, new Date(), learned);
  }, [chosen, zone, slots]);

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

  const best = suggestions[0] ?? null;
  const scheduledLabel = best && local === best.local ? suggestionLabel(best, zone, now) : instant ? new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: zone }).format(instant) : "";

  const saveToLaptop = (): void => {
    if (busy) return;
    setTo("download");
    void start({ kind: "download" });
  };

  const onOpenChange = (next: boolean): void => {
    if (!next && busy) return;
    setOpen(next);
    if (next) {
      setTo("post");
      loadAccounts();
    }
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

  const suggest = async (platforms: readonly Platform[] = chosen): Promise<void> => {
    setWriting(true);
    setCaptionError(null);
    const result = await writeCaption([title, script].filter(Boolean).join("\n\n"), platforms);
    setWriting(false);
    if (!result.ok) return setCaptionError(result.message);
    setWords((all) => {
      const next = { ...all };
      for (const platform of platforms) {
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
          <Dialog.Title className="text-base font-semibold text-ink">Post your video</Dialog.Title>
          <Dialog.Description className="sr-only">Post it to your connected accounts, or save it to this laptop.</Dialog.Description>

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
              {posting ? (
                <fieldset disabled={busy} className="space-y-4">
                  <div>
                    <span className="mb-1.5 block text-xs text-ink-soft">Accounts</span>
                    {accounts.status === "loading" ? (
                      <div className="space-y-2" aria-busy>
                        {[0, 1, 2].map((row) => (
                          <div key={row} className="h-10 animate-pulse rounded-lg bg-cloud" />
                        ))}
                      </div>
                    ) : accounts.status === "error" ? (
                      <p role="alert" className="text-sm text-destructive">
                        {accounts.message}
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
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
                                    "flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors",
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
                                <div className="flex min-h-10 items-center gap-2.5 rounded-lg border border-dashed border-hairline px-2.5 text-sm">
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
                              "h-7 cursor-pointer rounded-md px-2.5 text-xs font-medium transition-colors",
                              current === platform ? "bg-primary/10 font-medium text-primary" : "text-ink-soft hover:bg-cloud hover:text-ink",
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
                        {writing ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Lightbulb className="size-3.5" aria-hidden />}
                        {writing ? "Writing…" : currentWords.caption.trim() ? "Write again" : "Write caption"}
                      </button>
                    </div>
                    <textarea
                      id={`${id}-caption`}
                      value={currentWords.caption}
                      rows={3}
                      maxLength={2200}
                      disabled={!current}
                      onChange={(e) => setCurrent({ caption: e.target.value })}
                      placeholder={writing ? "Our AI is writing your caption…" : "Caption"}
                      className="field-sizing-content block min-h-20 w-full resize-none rounded-lg border border-hairline bg-paper p-3 text-sm text-ink focus-visible:border-primary focus-visible:outline-none"
                    />
                    {captionError ? <p className="mt-1 text-xs text-destructive">{captionError}</p> : null}
                  </div>

                  {best ? (
                    <div className="flex items-center gap-2 rounded-lg bg-cloud px-3 py-2 text-sm">
                      <Lightbulb className="size-4 shrink-0 text-primary" aria-hidden />
                      <span className="min-w-0 flex-1 text-ink">
                        {when === "later" && local
                          ? <>Scheduled for <span className="font-medium">{scheduledLabel}</span></>
                          : <>Best time: <span className="font-medium">{suggestionLabel(best, zone, now)}</span></>}
                      </span>
                      {when === "later" && local ? (
                        <>
                          <button type="button" onClick={() => setChangingTime((v) => !v)} className="cursor-pointer text-xs font-medium text-primary hover:underline">
                            Change
                          </button>
                          <button type="button" onClick={() => { setWhen("now"); setLocal(""); setChangingTime(false); }} className="cursor-pointer text-xs text-ink-soft hover:text-ink">
                            Post now
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => { setWhen("later"); setLocal(best.local); }} className="btn btn-primary btn-sm h-7 px-2.5 text-xs">
                          Approve
                        </button>
                      )}
                    </div>
                  ) : null}
                  {when === "later" && (changingTime || !best) ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <label htmlFor={`${id}-at`} className="mb-1 block text-xs text-ink-soft">
                          Date and time
                        </label>
                        <input id={`${id}-at`} type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} className={FIELD} />
                      </div>
                      <ZoneField id={`${id}-zone`} zone={zone} onChange={setZone} label="Time zone" />
                    </div>
                  ) : null}
                  {when === "later" && scheduleError && local ? <p className="text-xs text-destructive">{scheduleError}</p> : null}
                </fieldset>
              ) : null}

              {state.phase === "failed" ? (
                <p role="alert" className="text-sm text-destructive">
                  {state.message}
                </p>
              ) : null}

              <div className="flex items-center gap-2">
                {busy ? (
                  <Button type="button" variant="outline" size="sm" onClick={cancel} className="ml-auto">
                    {state.phase === "rendering" ? `${Math.round(state.progress * 100)}% · Cancel` : "Uploading…"}
                  </Button>
                ) : (
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                      Close
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={saveToLaptop}>
                      <LaptopMinimal aria-hidden />
                      Save to laptop
                    </Button>
                    <Button type="submit" size="sm" disabled={!ready} className="ml-auto">
                      <Send aria-hidden />
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
