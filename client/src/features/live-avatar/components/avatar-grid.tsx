"use client";

import { Plus } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import { EmptyState } from "@/components/ui/empty-state";
import { useConfirm } from "@/components/ui/use-confirm";
import { type VoiceProfile } from "@/features/voice/actions";
import { env } from "@/lib/env";
import { deleteTwin, makeDefaultTwin, type TwinSummary } from "../delete-actions";
import { startTwinTraining, ticketTwinFootage } from "../upload-actions";
import { useTwinStatus } from "../hooks/use-twin-status";
import { type TwinFootage } from "./create-twin-screen";
import { AvatarList } from "./avatar-list";
import { AvatarWizard, type AvatarWizardResult } from "./avatar-wizard";
import { hasReachedAvatarLimit, MAX_CUSTOM_AVATARS } from "../avatar-limits";

export function AvatarGrid({
  twins: initialTwins,
  name,
  voiceProfile,
  voicePhrase,
  children,
}: {
  twins: readonly TwinSummary[];
  name: string;
  /** This account's saved voice, so the wizard can skip re-recording it. */
  voiceProfile: VoiceProfile | null;
  voicePhrase: string;
  children?: ReactNode;
}): ReactNode {
  const router = useRouter();
  const { avatars, setAvatars, checkStatus, refreshConsent } = useTwinStatus(initialTwins);
  const [showWizard, setShowWizard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();
  const atAvatarLimit = hasReachedAvatarLimit(avatars.length);

  const handleDelete = useCallback(
    async (avatarId: string) => {
      // Native window.confirm is unstyled, blockable by the browser, and the
      // only dialog left in this feature not using the app's own confirm.
      const agreed = await confirm({
        title: "Delete this avatar?",
        description: "This cannot be undone. Any video you already made with it is unaffected.",
        confirmLabel: "Delete it",
        tone: "destructive",
      });
      if (!agreed) return;

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
    [router, confirm, setAvatars],
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
            })),
          );
          router.refresh();
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to set default");
      }
    },
    [router, setAvatars],
  );

  const handleRefreshConsent = useCallback(
    async (avatarId: string) => {
      const result = await refreshConsent(avatarId);
      if (result.status !== "ok") setError(result.message);
    },
    [refreshConsent],
  );

  const handleWizardComplete = useCallback(
    async (footage: TwinFootage): Promise<AvatarWizardResult> => {
      try {
        setError(null);

        // Step 1: Get storage ticket
        const ticketed = await ticketTwinFootage(footage.file.type);
        if (ticketed.status === "error") {
          return ticketed;
        }

        // Step 2: Upload the file to signed URL
        const baseType = footage.file.type.split(";")[0]!;
        const storage = createClient(
          env.NEXT_PUBLIC_SUPABASE_URL,
          env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        );
        const { error: uploadError } = await storage.storage
          .from("avatar-footage")
          .uploadToSignedUrl(ticketed.ticket.path, ticketed.ticket.token, footage.file, {
            contentType: baseType,
          });

        if (uploadError) {
          return { status: "error", message: uploadError.message };
        }

        // Step 3: Start training with the uploaded path
        const result = await startTwinTraining(ticketed.ticket.path);
        if (result.status === "error") {
          return result;
        }

        // Refresh the server-backed library before the wizard reveals it.
        router.refresh();

        // Placeholder only: replaced by the real row once router.refresh()
        // above lands and the sync effect picks it up. Carries the real
        // consent link immediately rather than making someone wait for that
        // round trip to find out HeyGen is waiting on them.
        if (result.training !== "failed") {
          setAvatars((current) => [
            ...current,
            {
              id: result.avatarId,
              name: null,
              trainingStatus: "pending" as const,
              isDefault: false,
              createdAt: new Date().toISOString(),
              error: null,
              consentUrl: result.consentUrl,
              consentUrlExpired: false,
              previewImageUrl: null,
              previewVideoUrl: null,
              recordingUrl: null,
              // Unknown here regardless of the account's real voice status:
              // this row is still training, so nothing can use it yet either
              // way. The refresh above replaces it with the real value.
              voiceReady: false,
              voiceId: null,
            },
          ]);
        }
        return { status: "ok" };
      } catch (err) {
        return {
          status: "error",
          message: err instanceof Error ? err.message : "Failed to start training",
        };
      }
    },
    [router, setAvatars],
  );

  if (avatars.length === 0 && !showWizard) {
    return (
      <EmptyState
        icon={Plus}
        title="No avatars yet"
        body="Record a video of yourself speaking. Your avatar can be reused in every video you create."
        action={{ label: "Record your first avatar", onClick: () => setShowWizard(true) }}
      />
    );
  }

  if (showWizard) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setShowWizard(false)}
          className="mb-4 text-sm text-primary underline underline-offset-2 hover:opacity-80"
        >
          ← Back
        </button>
        <AvatarWizard
          name={name}
          onComplete={handleWizardComplete}
          onSuccess={() => {
            setShowWizard(false);
            // So the next avatar this session creates sees a voice recorded
            // or cloned just now, rather than the snapshot this page loaded with.
            router.refresh();
          }}
          voiceProfile={voiceProfile}
          voicePhrase={voicePhrase}
        />
      </div>
    );
  }

  return (
    <div>
      {dialog}
      <div className="mb-6 flex items-center justify-end gap-3">
        <span className="text-xs text-ink-soft">
          {avatars.length} of {MAX_CUSTOM_AVATARS} avatars
        </span>
        {!atAvatarLimit ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setShowWizard(true);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Plus className="size-4" aria-hidden />
            New avatar
          </button>
        ) : (
          <span className="text-xs font-medium text-ink-soft">Avatar limit reached</span>
        )}
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
        onRetry={() => setShowWizard(true)}
        onCheckStatus={checkStatus}
        onRefreshConsent={handleRefreshConsent}
        canCreate={!atAvatarLimit}
        isDeleting={isDeleting}
        isDeletingId={deletingId}
      />
      {children ? <div className="mt-8">{children}</div> : null}
    </div>
  );
}
