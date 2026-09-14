"use client";

import { CheckCircle2, Loader, Trash2, AlertCircle, Star } from "lucide-react";
import { type ReactNode } from "react";
import { type TwinSummary } from "../delete-actions";

/**
 * Clean list view of user's avatars.
 *
 * Shows status clearly: ready (green), training (spinner), failed (red).
 * Default avatar has a star. Quick actions for each.
 */
export function AvatarList({
  avatars,
  onDelete,
  onSetDefault,
  isDeleting,
  isDeletingId,
}: {
  avatars: readonly TwinSummary[];
  onDelete: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  isDeleting: boolean;
  isDeletingId: string | null;
}): ReactNode {
  if (avatars.length === 0) {
    return (
      <div className="rounded-lg border border-hairline bg-canvas p-6 text-center">
        <p className="text-sm text-ink-soft">No avatars yet. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-hidden rounded-lg border border-hairline divide-y divide-hairline">
      {avatars.map((avatar) => (
        <div
          key={avatar.id}
          className="flex items-center gap-4 bg-paper p-4 transition-colors hover:bg-canvas"
        >
          {/* Status icon */}
          <div className="flex-shrink-0">
            {avatar.trainingStatus === "ready" ? (
              <CheckCircle2 className="size-5 text-success" />
            ) : avatar.trainingStatus === "pending" ? (
              <Loader className="size-5 animate-spin text-primary" />
            ) : (
              <AlertCircle className="size-5 text-destructive" />
            )}
          </div>

          {/* Name and status */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-medium text-ink">
                {avatar.name || `Avatar ${avatar.id.slice(0, 8)}`}
              </h3>
              {avatar.isDefault && (
                <Star className="size-3 flex-shrink-0 fill-primary text-primary" />
              )}
            </div>
            <p className="text-xs text-ink-soft">
              {avatar.trainingStatus === "ready"
                ? "Ready to use"
                : avatar.trainingStatus === "pending"
                  ? "Training in progress..."
                  : avatar.error || "Training failed"}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {avatar.trainingStatus === "ready" && !avatar.isDefault && (
              <button
                type="button"
                onClick={() => void onSetDefault(avatar.id)}
                className="px-2.5 py-1 text-xs font-medium text-primary rounded hover:bg-primary/10 transition-colors"
              >
                Set default
              </button>
            )}
            {avatar.trainingStatus !== "pending" && (
              <button
                type="button"
                onClick={() => void onDelete(avatar.id)}
                disabled={isDeleting && isDeletingId === avatar.id}
                className="p-1.5 text-ink-soft hover:text-destructive transition-colors disabled:opacity-50 disabled:cursor-wait"
                title="Delete avatar"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
