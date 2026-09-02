"use client";

import { CheckCircle2, CircleAlert, Loader2, Star, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { deleteTwin, makeDefaultTwin, type TwinSummary } from "../delete-actions";

/**
 * Every likeness somebody has recorded.
 *
 * One component, rendered both on the avatar screen and in account settings,
 * because the consent statement people read aloud promises deletion "from my
 * settings" and the library is where they will actually look for it. Two
 * implementations would drift, and the one that drifted would be the one
 * holding the promise.
 *
 * Deleting asks for the name to be typed. This erases a trained likeness at a
 * third party and cannot be undone by recording again: the new one is a
 * different avatar trained on different footage.
 */
export function TwinLibrary({
  twins,
  onChanged,
}: {
  twins: readonly TwinSummary[];
  onChanged?: () => void;
}): ReactNode {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (twins.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        You have not recorded one yet. It lets every video be made in your own face and voice.
      </p>
    );
  }

  const act = async (id: string, run: () => Promise<{ status: string; message?: string }>) => {
    setBusy(id);
    setError(null);
    const result = await run();
    setBusy(null);
    if (result.status === "ok") {
      setConfirming(null);
      setTyped("");
      onChanged?.();
    } else {
      setError(result.message ?? "That did not work.");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {twins.map((twin) => {
        const label = twin.name ?? "Untitled avatar";
        const ready = twin.trainingStatus === "ready";
        const failed = twin.trainingStatus === "failed";

        return (
          <article key={twin.id} className="rounded-xl border border-hairline p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
                  {label}
                  {twin.isDefault ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      <Star className="size-3 fill-current" aria-hidden />
                      Default
                    </span>
                  ) : null}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
                  {ready ? (
                    <CheckCircle2 className="size-3.5 text-success" aria-hidden />
                  ) : failed ? (
                    <CircleAlert className="size-3.5 text-destructive" aria-hidden />
                  ) : (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  )}
                  {ready
                    ? "Ready to use"
                    : failed
                      ? (twin.error ?? "Training did not finish")
                      : "Still training"}
                  {" · "}
                  {new Date(twin.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {ready && !twin.isDefault ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void act(twin.id, () => makeDefaultTwin(twin.id))}
                    className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-hairline px-3 text-sm text-ink-soft transition-colors hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
                  >
                    Use by default
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => {
                    setConfirming(confirming === twin.id ? null : twin.id);
                    setTyped("");
                    setError(null);
                  }}
                  aria-label={`Delete ${label}`}
                  className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-destructive/30 text-destructive transition-colors hover:bg-destructive/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </div>

            {confirming === twin.id ? (
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm text-ink">
                  This removes the trained avatar and the recording it came from, here and at the
                  provider. Recording again makes a different avatar, not this one back.
                </p>
                <label className="mt-2 block text-xs text-ink-soft" htmlFor={`confirm-${twin.id}`}>
                  Type <span className="font-medium text-ink">{label}</span> to confirm
                </label>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <input
                    id={`confirm-${twin.id}`}
                    value={typed}
                    autoComplete="off"
                    onChange={(event) => setTyped(event.target.value)}
                    className="h-9 min-w-0 flex-1 rounded-lg border border-hairline bg-transparent px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
                  />
                  <button
                    type="button"
                    disabled={typed.trim() !== label || busy !== null}
                    onClick={() => void act(twin.id, () => deleteTwin(twin.id))}
                    className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-destructive px-3 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy === twin.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : null}
                    Delete permanently
                  </button>
                </div>
              </div>
            ) : null}
          </article>
        );
      })}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
