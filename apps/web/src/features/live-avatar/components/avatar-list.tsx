"use client";

import { CheckCircle2, ExternalLink, Loader, Trash2, AlertCircle, Star, Video } from "lucide-react";
import { type ReactNode } from "react";
import { type TwinSummary } from "../delete-actions";

/**
 * Whether an avatar is sitting on HeyGen's consent step rather than actually
 * training. Pulled out of the JSX so it stays one definition, used both here
 * and by the smoke test that checks it against a raw `listTwins()` row shape.
 */
export function isAwaitingConsent(
  avatar: Pick<TwinSummary, "trainingStatus" | "consentUrl" | "consentUrlExpired">,
): boolean {
  return (
    avatar.trainingStatus === "pending" && avatar.consentUrl !== null && !avatar.consentUrlExpired
  );
}

/** A pending avatar with no live consent link needs a fresh one before it can move. */
export function needsFreshConsentLink(
  avatar: Pick<TwinSummary, "trainingStatus" | "consentUrl" | "consentUrlExpired">,
): boolean {
  return (
    avatar.trainingStatus === "pending" && (avatar.consentUrl === null || avatar.consentUrlExpired)
  );
}

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
  onCheckStatus,
  onRefreshConsent,
  canCreate,
  isDeleting,
  isDeletingId,
}: {
  avatars: readonly TwinSummary[];
  onDelete: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  onRetry: () => void;
  onCheckStatus: () => Promise<void>;
  onRefreshConsent: (id: string) => Promise<void>;
  canCreate: boolean;
  isDeleting: boolean;
  isDeletingId: string | null;
}): ReactNode {
  if (avatars.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {avatars.map((avatar) => {
        // HeyGen requires this consent step before it will train anything;
        // without a visible way to reach it, a person records successfully
        // and then simply waits, forever, on a step nobody showed them.
        const awaitingConsent = isAwaitingConsent(avatar);
        const needsNewConsentLink = needsFreshConsentLink(avatar);

        return (
          <div
            key={avatar.id}
            className="group relative overflow-hidden rounded-xl border border-hairline bg-paper transition-all hover:border-primary/30 hover:shadow-md"
          >
            {/* Avatar preview/visual area */}
            <div className="aspect-video bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center relative overflow-hidden">
              {avatar.trainingStatus === "ready" && avatar.previewVideoUrl ? (
                <video
                  src={avatar.previewVideoUrl}
                  poster={avatar.previewImageUrl ?? undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="size-full object-cover"
                  aria-label={`Preview of ${avatar.name || "this avatar"}`}
                />
              ) : avatar.trainingStatus === "ready" && avatar.recordingUrl ? (
                <video
                  src={avatar.recordingUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="size-full object-cover"
                  aria-label={`Original recording for ${avatar.name || "this avatar"}`}
                />
              ) : avatar.trainingStatus === "ready" && avatar.previewImageUrl ? (
                <img
                  src={avatar.previewImageUrl}
                  alt={`Preview of ${avatar.name || "this avatar"}`}
                  className="size-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                    {avatar.trainingStatus === "ready" ? (
                      <CheckCircle2 className="size-7 text-success" />
                    ) : awaitingConsent ? (
                      <ExternalLink className="size-7 text-primary" />
                    ) : avatar.trainingStatus === "pending" ? (
                      <Loader className="size-7 animate-spin text-primary" />
                    ) : (
                      <AlertCircle className="size-7 text-destructive" />
                    )}
                  </div>
                </div>
              )}

              {/* Default star badge */}
              {avatar.isDefault && (
                <div className="absolute top-2 right-2 bg-primary rounded-full p-1.5">
                  <Star className="size-3 fill-paper text-paper" />
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
                    : awaitingConsent
                      ? "Needs consent"
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
                  ? avatar.previewVideoUrl
                    ? "Play the preview to check your avatar before using it."
                    : "Review your original recording while the avatar preview becomes available."
                  : awaitingConsent
                    ? "HeyGen needs you to confirm consent on their secure page before training can start."
                    : avatar.trainingStatus === "pending"
                      ? "Learning a face and a voice takes a few minutes. You can leave this page, it carries on without you."
                      : avatar.error ||
                        "That didn't finish. Nothing was lost, recording again is safe."}
              </p>

              {/* Actions */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-hairline">
                {awaitingConsent && (
                  <a
                    href={avatar.consentUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-2 py-1.5 text-center text-xs font-medium text-paper bg-primary rounded hover:opacity-90 transition-opacity"
                  >
                    Continue to consent step
                  </a>
                )}
                {needsNewConsentLink && (
                  <button
                    type="button"
                    onClick={() => void onRefreshConsent(avatar.id)}
                    className="flex-1 px-2 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded hover:bg-primary/20 transition-colors"
                  >
                    Get a new setup link
                  </button>
                )}
                {avatar.trainingStatus === "pending" && (
                  <button
                    type="button"
                    onClick={() => void onCheckStatus()}
                    className="px-2 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded hover:bg-primary/20 transition-colors"
                  >
                    Check status
                  </button>
                )}
                {avatar.trainingStatus === "ready" && (
                  // Jumps down the page rather than away from it: the form
                  // that actually uses this avatar is the section right
                  // below, and a link to /dashboard used to send someone
                  // looking for "use it" to the general chat composer
                  // instead, which does not use a trained twin at all.
                  <a
                    href="#twin-speak-heading"
                    className="flex-1 px-2 py-1.5 text-center text-xs font-medium text-paper bg-primary rounded hover:opacity-90 transition-opacity"
                  >
                    Use in a video
                  </a>
                )}
                {avatar.trainingStatus === "ready" &&
                  (avatar.previewVideoUrl || avatar.recordingUrl) && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-1.5 text-xs text-ink-soft">
                      <Video className="size-3" /> Preview
                    </span>
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
                {avatar.trainingStatus === "failed" && canCreate && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="flex-1 px-2 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded hover:bg-primary/20 transition-colors"
                  >
                    Try again
                  </button>
                )}
                {/*
                 * Deletable at any stage, including pending: without this, a
                 * person stuck on a consent step they cannot complete (or do
                 * not want to) had no way to withdraw the recording they
                 * already uploaded.
                 */}
                <button
                  type="button"
                  onClick={() => void onDelete(avatar.id)}
                  disabled={isDeleting && isDeletingId === avatar.id}
                  className="p-1.5 text-ink-soft hover:text-destructive transition-colors disabled:opacity-50 disabled:cursor-wait ml-auto"
                  title="Delete avatar"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
