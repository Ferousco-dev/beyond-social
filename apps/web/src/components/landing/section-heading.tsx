import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";

/**
 * Shared section heading. One eyebrow, one title, one optional line of support,
 * so every section opens with the same rhythm and the page reads as one system.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}): ReactNode {
  return (
    <Reveal className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-pretty text-base leading-relaxed text-ink-soft">{description}</p>
      ) : null}
    </Reveal>
  );
}
