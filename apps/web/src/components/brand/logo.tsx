import Image from "next/image";
import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Brand mark plus wordmark. The mark ships as two raster assets with baked
 * backgrounds (light and dark), so we render both and swap with the theme
 * class rather than recoloring the official logo.
 */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}): ReactNode {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative inline-flex size-8 shrink-0 overflow-hidden rounded-lg border border-border">
        <Image
          src="/brand/logo-mark-light.png"
          alt={showWordmark ? "" : "Beyond Social"}
          width={64}
          height={64}
          className="size-full object-cover dark:hidden"
          priority
        />
        <Image
          src="/brand/logo-mark-dark.png"
          alt=""
          aria-hidden
          width={64}
          height={64}
          className="hidden size-full object-cover dark:block"
          priority
        />
      </span>
      {showWordmark ? (
        <span className="text-[15px] font-semibold tracking-tight">Beyond Social</span>
      ) : null}
    </span>
  );
}
