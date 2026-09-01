"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { deleteTwin, type TwinSummary } from "../delete-actions";

/**
 * The avatar, and the button that removes it.
 *
 * Sits in account settings rather than beside the other assets because of what
 * the consent statement promises. People read "which I can delete at any time
 * from my settings" aloud, on camera, as the price of making one; the control
 * has to be where that sentence says it is. It sits next to account deletion
 * for the same reason, since both answer "take this back".
 *
 * Confirmation is typed rather than a second click. This erases a trained
 * likeness at a third party and cannot be undone by re-recording: the new twin
 * would be a different one, trained on different footage.
 */
export function TwinSettingsCard({ twin }: { twin: TwinSummary | null }): ReactNode {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gone, setGone] = useState(false);

  if (gone || !twin) {
    return (
      <section className="mt-8 rounded-xl border border-hairline p-5">
        <h2 className="text-sm font-medium text-ink">Your avatar</h2>
        <p className="mt-2 text-sm text-ink-soft">
          {gone
            ? "Deleted. Nothing of that recording is kept, here or at the provider."
            : "You have not recorded one yet. It lets every video be made in your own face and voice."}
        </p>
      </section>
    );
  }

  const state =
    twin.trainingStatus === "ready"
      ? "Ready to use"
      : twin.trainingStatus === "failed"
        ? "Training did not finish"
        : "Still training";

  return (
    <section className="mt-8 rounded-xl border border-hairline p-5">
      <h2 className="text-sm font-medium text-ink">Your avatar</h2>
      <p className="mt-2 text-sm text-ink-soft">
        {state}. Recorded {new Date(twin.createdAt).toLocaleDateString()}. This is a trained copy of
        your face and voice, held here and at the provider that generates from it.
      </p>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-4 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-destructive/30 px-3 text-sm text-destructive transition-colors hover:bg-destructive/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
        >
          <Trash2 className="size-4" aria-hidden />
          Delete my avatar
        </button>
      ) : (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-ink">
            This removes the trained avatar and the recording it was made from, here and at the
            provider. Recording again makes a different avatar, not this one back.
          </p>
          <label className="mt-3 block text-xs text-ink-soft" htmlFor="twin-confirm">
            Type <span className="font-medium text-ink">delete</span> to confirm
          </label>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <input
              id="twin-confirm"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              className="h-9 w-40 rounded-lg border border-hairline bg-transparent px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
            />
            <button
              type="button"
              disabled={typed.trim().toLowerCase() !== "delete" || busy}
              onClick={() => {
                setBusy(true);
                setError(null);
                void deleteTwin().then((result) => {
                  setBusy(false);
                  if (result.status === "ok") setGone(true);
                  else setError(result.message);
                });
              }}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-destructive px-3 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {busy ? "Deleting" : "Delete permanently"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setTyped("");
                setError(null);
              }}
              className="inline-flex h-9 cursor-pointer items-center rounded-lg px-3 text-sm text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Keep it
            </button>
          </div>

          {error ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
