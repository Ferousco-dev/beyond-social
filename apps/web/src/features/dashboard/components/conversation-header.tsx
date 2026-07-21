import { SquareArrowOutUpRight } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";

/**
 * Names the project the thread belongs to. Without it the conversation gives
 * no indication of which project is open.
 */
export function ConversationHeader({ title, editorHref }: { title: string; editorHref: Route }) {
  return (
    <header className="sticky top-0 z-10 -mx-4 flex items-center gap-3 border-b border-hairline bg-canvas/80 px-4 py-3 backdrop-blur">
      <h1 className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{title}</h1>

      <Link
        href={editorHref}
        className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <SquareArrowOutUpRight className="size-3.5" aria-hidden />
        Open editor
      </Link>
    </header>
  );
}
