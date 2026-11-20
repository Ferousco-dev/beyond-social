import { type ReactNode } from "react";

import { CardArt } from "@/features/new-video/components/card-art";
import { NEW_VIDEO_OPTIONS } from "@/features/new-video/options";

/**
 * New Video while its page loads: the same title and starting points, so
 * coming Back here looks finished at once and the cards only become clickable.
 */
export default function NewVideoLoading(): ReactNode {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">New Video</h1>
      <p className="mt-1 text-sm text-ink-soft">Pick a starting point. Every path ends at the main generation page.</p>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
        {NEW_VIDEO_OPTIONS.map((item) => (
          <li key={item.id}>
            <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-hairline bg-paper text-left">
              <span className="block h-24 w-full bg-cloud/70 p-3 sm:h-28">
                <CardArt id={item.id} />
              </span>
              <span className="block p-3.5 sm:p-4">
                <span className="block text-sm font-semibold text-ink">{item.title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-soft">{item.body}</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
