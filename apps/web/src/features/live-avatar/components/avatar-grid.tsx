"use client";

import { Plus } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import { EmptyState } from "@/components/ui/empty-state";
import { env } from "@/lib/env";
import { deleteTwin, makeDefaultTwin, type TwinSummary } from "../delete-actions";
import { startTwinTraining, ticketTwinFootage } from "../upload-actions";
import { type TwinFootage } from "./create-twin-screen";
import { AvatarList } from "./avatar-list";
import { AvatarWizard } from "./avatar-wizard";

export function AvatarGrid({
  twins: initialTwins,
  name,
}: {
  twins: readonly TwinSummary[];
  name: string;
}): ReactNode {
  const router = useRouter();
  const [avatars, setAvatars] = useState(initialTwins);
  const [showWizard, setShowWizard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    [router],
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
    [router],
  );

  const handleWizardComplete = useCallback(
    async (footage: TwinFootage) => {
      try {
        setError(null);

        // Step 1: Get storage ticket
        const ticketed = await ticketTwinFootage(footage.file.type);
        if (ticketed.status === "error") {
          setError(ticketed.message);
          setShowWizard(true);
          return;
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
              trainingStatus: "pending" as const,
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
    [router],
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
        <AvatarWizard name={name} onComplete={handleWizardComplete} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setShowWizard(true);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Plus className="size-4" />
          New avatar
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
  );
}
