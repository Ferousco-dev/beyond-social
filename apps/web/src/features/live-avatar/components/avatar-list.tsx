"use client";

import { CheckCircle2, Loader, Trash2, AlertCircle, Star } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";
import { type TwinSummary } from "../delete-actions";

/**
 * Visual grid of user's avatars with status indicators.
 *
 * Shows each avatar as a card with status, name, and quick actions.
 * Ready avatars show a green checkmark, training ones show a spinner.
 */
export function AvatarList({
  avatars,
  onDelete,
  onSetDefault,
  onRetry,
  isDeleting,
  isDeletingId,
}: {
  avatars: readonly TwinSummary[];
  onDelete: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  onRetry: () => void;
  isDeleting: boolean;
  isDeletingId: string | null;
}): ReactNode {
  if (avatars.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {avatars.map((avatar) => (
        <div
          key={avatar.id}
          className="group relative overflow-hidden rounded-xl border border-hairline bg-paper transition-all hover:border-primary/30 hover:shadow-md"
        >
          {/* Avatar preview/visual area */}
          <div className="aspect-video bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center relative overflow-hidden">
            {/* Status indicator circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                {avatar.trainingStatus === "ready" ? (
                  <CheckCircle2 className="size-7 text-success" />
                ) : avatar.trainingStatus === "pending" ? (
                  <Loader className="size-7 animate-spin text-primary" />
                ) : (
                  <AlertCircle className="size-7 text-destructive" />
                )}
              </div>
            </div>

            {/* Default star badge */}
            {avatar.isDefault && (
              <div className="absolute top-2 right-2 bg-primary rounded-full p-1.5">
                <Star className="size-3 fill-white text-white" />
              </div>
            )}

            {/* Status label */}
            <div className="absolute top-2 left-2">
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  avatar.trainingStatus === "ready"
                    ? "bg-success/20 text-success"
                    : avatar.trainingStatus === "pending"
                      ? "bg-primary/20 text-primary"
                      : "bg-destructive/20 text-destructive"
                }`}
              >
                {avatar.trainingStatus === "ready"
                  ? "Ready"
                  : avatar.trainingStatus === "pending"
                    ? "Training"
                    : "Failed"}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="truncate text-sm font-semibold text-ink">
              {avatar.name || `Avatar ${avatar.id.slice(0, 8)}`}
            </h3>
            <p className="text-xs text-ink-soft mt-1">
              {avatar.trainingStatus === "ready"
                ? "Ready to use"
                : avatar.trainingStatus === "pending"
                  ? "Learning a face and a voice takes a few minutes. You can leave this page, it carries on without you."
                  : avatar.error || "That didn't finish. Nothing was lost, recording again is safe."}
            </p>

            {/* Actions */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-hairline">
              {avatar.trainingStatus === "ready" && (
                <Link
                  href="/dashboard"
                  className="flex-1 px-2 py-1.5 text-center text-xs font-medium text-white bg-primary rounded hover:opacity-90 transition-opacity"
                >
                  Use in a video
                </Link>
              )}
              {avatar.trainingStatus === "ready" && !avatar.isDefault && (
                <button
                  type="button"
                  onClick={() => void onSetDefault(avatar.id)}
                  className="flex-1 px-2 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded hover:bg-primary/20 transition-colors"
                >
                  Set default
                </button>
              )}
              {avatar.trainingStatus === "failed" && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex-1 px-2 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded hover:bg-primary/20 transition-colors"
                >
                  Try again
                </button>
              )}
              {avatar.trainingStatus !== "pending" && (
                <button
                  type="button"
                  onClick={() => void onDelete(avatar.id)}
                  disabled={isDeleting && isDeletingId === avatar.id}
                  className="p-1.5 text-ink-soft hover:text-destructive transition-colors disabled:opacity-50 disabled:cursor-wait ml-auto"
                  title="Delete avatar"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
