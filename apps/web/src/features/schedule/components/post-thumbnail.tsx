import { Film } from "lucide-react";
import { type ReactNode } from "react";

/**
 * The first frame of the video the post carries.
 *
 * A `<video>` with `preload="metadata"` rather than an `<img>`, because there
 * is no thumbnail column anywhere in the schema: the only real image available
 * is the one the browser can draw from the file itself. When the generation is
 * gone the placeholder says so instead of inventing a picture.
 */
export function PostThumbnail({ videoUrl }: { readonly videoUrl: string | null }): ReactNode {
  if (videoUrl === null) {
    return (
      <span
        aria-hidden
        className="flex aspect-[9/16] w-14 shrink-0 items-center justify-center rounded-lg border border-hairline bg-cloud text-ink-soft"
      >
        <Film className="size-4" />
      </span>
    );
  }

  return (
    <video
      src={videoUrl}
      preload="metadata"
      muted
      playsInline
      // Decorative here: the caption and platform beside it already say what
      // the post is, so a screen reader gains nothing from the media element.
      aria-hidden
      tabIndex={-1}
      className="aspect-[9/16] w-14 shrink-0 rounded-lg border border-hairline bg-cloud object-cover"
    />
  );
}
