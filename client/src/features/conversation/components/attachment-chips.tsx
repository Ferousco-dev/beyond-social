import { Film, Music, X, AlertCircle } from "lucide-react";
import { type ReactNode } from "react";

import { Spinner } from "@/components/ui/spinner";

import { type DraftAttachment } from "../hooks/use-attachments";

/** The files waiting to go with the next message. */
export function AttachmentChips({
  items,
  onRemove,
}: {
  readonly items: readonly DraftAttachment[];
  readonly onRemove: (key: string) => void;
}): ReactNode {
  if (items.length === 0) return null;

  return (
    <ul aria-label="Attached files" className="flex flex-wrap gap-2 px-2 pb-2">
      {items.map((item) => {
        const failed = item.state === "failed";
        return (
          <li
            key={item.key}
            className="flex max-w-[16rem] items-center gap-2 rounded-xl border border-hairline bg-canvas py-1 pl-1 pr-1.5"
          >
            <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-cloud text-ink-soft">
              {item.previewUrl ? (
                // A local object URL of the user's own file: nothing to optimise.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewUrl} alt="" className="size-full object-cover" />
              ) : item.file.type.startsWith("video/") ? (
                <Film className="size-4" aria-hidden />
              ) : (
                <Music className="size-4" aria-hidden />
              )}
              {item.state === "uploading" ? (
                <span className="absolute inset-0 flex items-center justify-center bg-canvas/70">
                  <Spinner className="size-4" />
                </span>
              ) : null}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs text-ink">{item.file.name || "Voice note"}</span>
              {failed ? (
                <span role="alert" className="flex items-center gap-1 text-[11px] text-destructive">
                  <AlertCircle className="size-3" aria-hidden />
                  {item.message}
                </span>
              ) : null}
            </span>
            <button
              type="button"
              onClick={() => onRemove(item.key)}
              aria-label={`Remove ${item.file.name || "voice note"}`}
              className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-soft hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
