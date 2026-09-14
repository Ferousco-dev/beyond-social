"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { startTwinTraining, twinStatus } from "../upload-actions";
import { type TwinSummary } from "../delete-actions";
import { AvatarWizard } from "./avatar-wizard";
import { AvatarList } from "./avatar-list";
import { deleteTwin, makeDefaultTwin } from "../delete-actions";

/**
 * The client half of avatar creation: wizard-based step-by-step flow.
 *
 * Simplified to focus on one thing at a time. Matches HeyGen's UX pattern.
 */

const POLL_MS = 4000;

export function CreateTwinEntry({
  name,
  twins,
}: {
  name: string;
  twins: readonly TwinSummary[];
}): ReactNode {
  const router = useRouter();
  const [avatars, setAvatars] = useState(twins);
  const [showWizard, setShowWizard] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll for training status updates on existing avatars
  useEffect(() => {
    if (avatars.every((a) => a.trainingStatus !== "pending")) return;

    const tick = async (): Promise<void> => {
      try {
        const status = await twinStatus();
        if (status.training) {
          setAvatars((current) =>
            current.map((a) =>
              a.trainingStatus === "pending"
                ? {
                    ...a,
                    trainingStatus:
                      status.training === "ready"
                        ? "ready"
                        : status.training === "failed"
                          ? "failed"
                          : "pending",
                    error: status.error ?? null,
                  }
                : a
            )
          );
        }
      } catch (err) {
        console.error("Failed to poll avatar status", err);
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [avatars]);

  const handleWizardComplete = useCallback(
    async (footage: { readonly file: File; readonly seconds: number | null; readonly source: string }) => {
      try {
        setError(null);
        const result = await startTwinTraining(footage.file);
        if (result.status === "error") {
          setError(result.message);
          setShowWizard(true);
          return;
        }

        // Reset wizard and refresh
        setShowWizard(false);
        router.refresh();

        // Add training avatar to list
        if (result.training !== "failed") {
          setAvatars((current) => [
            ...current,
            {
              id: Math.random().toString(36).slice(2),
              name: null,
              trainingStatus: "pending",
              isDefault: false,
              createdAt: new Date().toISOString(),
              error: null,
            },
          ]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start training");
        setShowWizard(true);
      }
    },
    [router]
  );

  const handleDelete = useCallback(
    async (avatarId: string) => {
      if (!window.confirm("Delete this avatar? This cannot be undone.")) return;

      setIsDeleting(true);
      setDeletingId(avatarId);
      try {
        const result = await deleteTwin(avatarId);
        if (result.status === "ok") {
          setAvatars((current) => current.filter((a) => a.id !== avatarId));
          router.refresh();
        } else {
          setError(result.message);
        }
      } finally {
        setIsDeleting(false);
        setDeletingId(null);
      }
    },
    [router]
  );

  const handleSetDefault = useCallback(
    async (avatarId: string) => {
      try {
        const result = await makeDefaultTwin(avatarId);
        if (result.status === "ok") {
          setAvatars((current) =>
            current.map((a) => ({
              ...a,
              isDefault: a.id === avatarId,
            }))
          );
          router.refresh();
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to set default");
      }
    },
    [router]
  );

  return (
    <div className="space-y-8">
      {showWizard ? (
        <div>
          <button
            type="button"
            onClick={() => setShowWizard(false)}
            className="mb-4 text-sm text-primary underline underline-offset-2 hover:opacity-80"
          >
            ← Back to list
          </button>
          <AvatarWizard name={name} onComplete={handleWizardComplete} />
        </div>
      ) : (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Your avatars</h2>
              <p className="text-sm text-ink-soft">
                Record once, reuse for every video. The default is used when you don't pick one.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setShowWizard(true);
              }}
              className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              + New avatar
            </button>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <AvatarList
            avatars={avatars}
            onDelete={handleDelete}
            onSetDefault={handleSetDefault}
            isDeleting={isDeleting}
            isDeletingId={deletingId}
          />
        </div>
      )}
    </div>
  );
}
