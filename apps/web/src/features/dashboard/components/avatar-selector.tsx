"use client";

import { CheckCircle2, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useAvatars } from "@/features/live-avatar/hooks/use-avatars";

interface AvatarSelectorProps {
  selectedAvatarId: string | null;
  onSelect: (avatarId: string | null) => void;
}

export function AvatarSelector({ selectedAvatarId, onSelect }: AvatarSelectorProps): ReactNode {
  const { avatars, loading } = useAvatars();
  const [open, setOpen] = useState(false);

  // Trained alone is not enough: a twin cannot render without a cloned voice
  // (see `TwinSummary.voiceReady`), and offering it here would only surface
  // that as a failure after the composer already sent the request.
  const readyAvatars = avatars.filter((a) => a.trainingStatus === "ready" && a.voiceReady);
  const selectedAvatar = avatars.find((avatar) => avatar.id === selectedAvatarId);

  if (readyAvatars.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex h-8 max-w-44 items-center gap-1.5 rounded-full border border-hairline px-1.5 text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        title="Select avatar"
      >
        {loading ? (
          <Spinner className="size-3" />
        ) : selectedAvatar ? (
          <>
            {selectedAvatar.previewImageUrl ? (
              // Provider-hosted preview image, selected by the owner in this control.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedAvatar.previewImageUrl}
                alt={selectedAvatar.name || "Selected avatar"}
                className="size-5 rounded-full object-cover"
              />
            ) : (
              <CheckCircle2 className="size-3.5 text-success" aria-hidden />
            )}
            <span className="max-w-28 truncate text-xs font-medium">
              {selectedAvatar.name || "Avatar"}
            </span>
          </>
        ) : (
          // No icon-less bare "None": the closed trigger has to read as an
          // avatar picker on its own, not only once something is chosen.
          <>
            <UserRound className="size-3.5 text-ink-soft" aria-hidden />
            <span className="text-xs text-ink-soft">Avatar</span>
          </>
        )}
      </button>

      {open ? (
        <>
          {/* Backdrop to close dropdown */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />

          {/* Dropdown menu */}
          <div className="absolute bottom-full left-0 z-50 mb-2 min-w-48 rounded-lg border border-hairline bg-paper shadow-card">
            <div className="max-h-60 overflow-y-auto">
              {/* Option to clear selection */}
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-xs transition-colors hover:bg-canvas"
              >
                <span className={selectedAvatarId === null ? "font-medium text-ink" : "text-ink-soft"}>
                  None
                </span>
              </button>

              {/* Avatar options */}
              {readyAvatars.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => {
                    onSelect(avatar.id);
                    setOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left text-xs transition-colors ${
                    selectedAvatarId === avatar.id
                      ? "bg-primary-soft text-ink"
                      : "hover:bg-canvas text-ink"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`size-3 ${
                        selectedAvatarId === avatar.id ? "text-primary" : "text-ink-soft"
                      }`}
                      aria-hidden
                    />
                    <span className="font-medium">
                      {avatar.name || `Avatar ${avatar.id.slice(0, 8)}`}
                    </span>
                  </div>
                  <div className="ml-5 text-xs text-ink-soft">
                    Created {new Date(avatar.createdAt).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
