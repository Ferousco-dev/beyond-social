"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";

import { startTwinTraining, ticketTwinFootage, twinStatus } from "../upload-actions";
import { type TwinSummary } from "../delete-actions";
import { env } from "@/lib/env";
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
    const pendingAvatars = avatars.filter((a) => a.trainingStatus === "pending");
    if (pendingAvatars.length === 0) return;

    const tick = async (): Promise<void> => {
      try {
        // Fetch fresh status from server for current avatar state
        const status = await twinStatus();
        if (status.training) {
          setAvatars((current) =>
            current.map((avatar) => {
              // Only update pending avatars
              if (avatar.trainingStatus !== "pending") return avatar;

              return {
                ...avatar,
                trainingStatus:
                  status.training === "ready"
                    ? "ready"
                    : status.training === "failed"
                      ? "failed"
                      : "pending",
                error: status.error ?? null,
              };
            })
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to check avatar status";
        console.error("Failed to poll avatar status", err);
        setError(message);
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), POLL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const handleWizardComplete = useCallback(
    async (footage: { readonly file: File; readonly seconds: number | null; readonly source: string }) => {
      try {
        setError(null);

        // Step 1: Get storage ticket
        const ticketed = await ticketTwinFootage(footage.file.type);
        if (ticketed.status === "error") {
          setError(ticketed.message);
          setShowWizard(true);
          return;
        }

        // Step 2: Upload the actual file to signed URL
        const baseType = footage.file.type.split(";")[0]!;
        const storage = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        const { error: uploadError } = await storage.storage
          .from("avatar-footage")
          .uploadToSignedUrl(ticketed.ticket.path, ticketed.ticket.token, footage.file, {
            contentType: baseType,
          });

        if (uploadError) {
          setError(uploadError.message);
          setShowWizard(true);
          return;
        }

        // Step 3: Start training with the uploaded path
        const result = await startTwinTraining(ticketed.ticket.path);
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
              id: crypto.randomUUID(),
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
