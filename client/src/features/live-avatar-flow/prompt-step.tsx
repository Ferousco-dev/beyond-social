"use client";

import { useState } from "react";

import type { AssetGroupDetail } from "@/lib/go-api/schemas";
import type { GoJob } from "@/lib/go-api/schemas";

import type { AvatarBrief } from "./brief-step";
import { createLiveAvatar, draftLiveAvatarScript } from "./actions";

/** Final step: write the prompt, compile everything, approve, follow progress. */
export function PromptStep({
  group,
  brief,
  voiceId,
  script,
}: {
  group: AssetGroupDetail;
  brief: AvatarBrief;
  voiceId: string;
  script: string;
}) {
  const [prompt, setPrompt] = useState(script);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<GoJob | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  function direction(): string {
    return [brief.objective, brief.audience && `Audience: ${brief.audience}`, brief.product && `Product: ${brief.product}`, brief.style].filter(Boolean).join(". ");
  }

  async function submit() {
    if (prompt.trim() === "" || busy) return;
    setBusy(true);
    setError(null);
    const result = await createLiveAvatar({ groupId: group.id, voiceId, script: prompt, prompt: direction(), idempotencyKey: crypto.randomUUID() });
    setBusy(false);
    if (result.status !== "ok") {
      setError(result.status === "unconfigured" ? "The backend is not connected yet." : result.message);
      return;
    }
    setJob(result.job);
  }

  async function draft(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await draftLiveAvatarScript(brief);
    setBusy(false);
    if (result.status !== "ok") {
      setError(result.status === "unconfigured" ? "The backend is not connected yet." : result.message);
      return;
    }
    setPrompt(result.script);
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        What should your avatar say and do?
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={5}
          placeholder="Say hello, introduce the serum, point at it, end with the shop link."
          className="w-full rounded-[10px] border border-hairline bg-paper px-3 py-2.5 text-sm leading-relaxed text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary"
        />
      </label>

      <button type="button" onClick={() => void draft()} disabled={busy} className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] border border-hairline px-4 text-sm font-medium text-ink transition-colors hover:bg-cloud disabled:opacity-40">
        {busy ? "Writing…" : "Draft with AI"}
      </button>

      <label className="flex items-start gap-3 rounded-[10px] border border-hairline bg-paper p-4 text-sm text-ink-soft">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 size-4 accent-primary" />
        <span>I have reviewed this script and approve using my consented face and cloned voice to generate this video.</span>
      </label>

      {!job ? (
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || prompt.trim() === "" || !confirmed}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] bg-ink px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Starting…" : "Generate video"}
        </button>
      ) : (
        <p className="rounded-[10px] border border-hairline bg-paper p-4 text-sm text-ink-soft">Your video is {job.status}. It will appear in Projects when complete.</p>
      )}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
