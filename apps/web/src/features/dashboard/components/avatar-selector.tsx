"use client";

import { CheckCircle2, ChevronDown } from "lucide-react";
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

  const readyAvatars = avatars.filter((a) => a.trainingStatus === "ready");
  const selectedAvatar = avatars.find((a) => a.id === selectedAvatarId);

  if (readyAvatars.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        title="Select avatar"
      >
        {loading ? (
          <Spinner className="size-3" />
        ) : selectedAvatar ? (
          <>
            <CheckCircle2 className="size-3 text-success" aria-hidden />
            <span className="max-w-xs truncate text-xs font-medium">
              {selectedAvatar.name || `Avatar ${selectedAvatar.id.slice(0, 8)}`}
            </span>
          </>
        ) : (
          <span className="text-xs text-ink-soft">No avatar selected</span>
        )}
        <ChevronDown className="size-3 text-ink-soft" aria-hidden />
      </button>

      {open ? (
        <>
          {/* Backdrop to close dropdown */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />

          {/* Dropdown menu */}
          <div className="absolute top-full right-0 z-50 mt-2 min-w-48 rounded-lg border border-hairline bg-paper shadow-card">
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
                <span className="text-ink-soft">None</span>
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
