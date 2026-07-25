import Image from "next/image";
import { type ReactNode } from "react";

/**
 * A macOS-style window frame around a real screenshot of the product. Drawn in
 * CSS rather than shipped as artwork, so it stays crisp at any resolution and
 * costs nothing to download.
 */
export function ScreenshotFrame({
  src,
  alt,
  label,
  priority = false,
}: {
  src: string;
  alt: string;
  /** Shown in the window's title strip, like a tab or address. */
  label?: string;
  priority?: boolean;
}): ReactNode {
  return (
    <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-white/10 bg-[#17171b] shadow-2xl sm:rounded-2xl">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
        <span aria-hidden className="flex shrink-0 items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </span>
        {label ? (
          <span className="mx-auto hidden max-w-[60%] truncate rounded-md bg-white/5 px-3 py-1 text-[11px] text-white/40 sm:block">
            {label}
          </span>
        ) : null}
        <span aria-hidden className="w-[52px] shrink-0 sm:hidden" />
      </div>

      <Image
        src={src}
        alt={alt}
        width={1800}
        height={1125}
        priority={priority}
        sizes="(max-width: 640px) 92vw, (max-width: 1024px) 92vw, 1024px"
        className="block w-full object-cover object-top"
      />
    </div>
  );
}
