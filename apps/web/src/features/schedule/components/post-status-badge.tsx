import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { type PostStatus } from "../lib/types";

const STATUS: Readonly<Record<PostStatus, { readonly label: string; readonly className: string }>> =
  {
    scheduled: { label: "Scheduled", className: "border-hairline text-ink-soft" },
    publishing: { label: "Publishing", className: "border-primary/40 text-primary" },
    published: { label: "Published", className: "border-success/40 text-success" },
    failed: { label: "Failed", className: "border-destructive/40 text-destructive" },
  };

/** Colour carries the same meaning as the word, never on its own. */
export function PostStatusBadge({ status }: { readonly status: PostStatus }): ReactNode {
  const { label, className } = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}
