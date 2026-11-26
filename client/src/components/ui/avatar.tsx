import Image from "next/image";
import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Soft two-tone fills, in the style of the macOS Contacts placeholders: muted,
 * top-lit, with white initials. A name always gets the same one.
 */
const FILLS = [
  ["#a3a8b4", "#6b7080"], // graphite
  ["#7c78b8", "#4b4785"], // slate violet
  ["#7ea6d8", "#4a72aa"], // steel blue
  ["#7fb6a2", "#4b8570"], // sage
  ["#d4a37c", "#a86f47"], // clay
  ["#c58aa5", "#935674"], // dusk rose
] as const;

function fillFor(seed: string): readonly [string, string] {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return FILLS[hash % FILLS.length]!;
}

/** One or two letters from a name, or from the email when there is no name. */
export function initialsOf(name: string, email = ""): string {
  const source = name.trim() || email.split("@")[0] || "";
  const parts = source.split(/[\s._-]+/u).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function Avatar({
  name,
  email,
  initials,
  src,
  className,
}: {
  name: string;
  email?: string;
  /** Use these letters instead of working them out from the name. */
  initials?: string;
  src?: string | null;
  className?: string;
}): ReactNode {
  const [top, bottom] = fillFor((name || email || "").toLowerCase());
  return (
    <span
      aria-hidden
      className={cn("relative inline-flex size-8 shrink-0 select-none items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold tracking-wide text-white", className)}
      style={{ backgroundImage: `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`, boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.22)" }}
    >
      {src ? <Image src={src} alt="" fill sizes="64px" unoptimized className="object-cover" /> : (initials ?? initialsOf(name, email))}
    </span>
  );
}
