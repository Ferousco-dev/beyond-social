"use client";

import { Play, RotateCw } from "lucide-react";
import { useState, type ReactNode } from "react";

interface Props {
  readonly embedUrl: string | null;
  readonly title: string;
  readonly posterUrl: string | null;
  readonly platformName: string;
  readonly postUrl: string;
}

/**
 * The platform's own player, started on demand.
 *
 * It used to load the moment a result was chosen, and the first result opens on
 * its own after every search, so each search loaded a player nobody had asked
 * for. TikTok answers that kind of traffic with a bare "overload-protect
 * triggered" page inside the frame, which cannot be detected from here. Showing
 * the picture first and loading the player on a press cuts those loads to the
 * ones someone wants, and a reload button covers the times it is still refused.
 */
export function PostPlayer({ embedUrl, title, posterUrl, platformName, postUrl }: Props): ReactNode {
  const [started, setStarted] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if (!embedUrl) {
    return (
      <div className="flex aspect-[9/16] w-full items-center justify-center px-6 text-center">
        <p className="text-xs text-ink-soft">This one cannot be played here. Open it on {platformName} instead.</p>
      </div>
    );
  }

  if (!started) {
    return (
      <button
        type="button"
        onClick={() => setStarted(true)}
        aria-label={`Play ${title}`}
        className="group relative block aspect-[9/16] w-full cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      >
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a third party thumbnail shown as a still
          <img src={posterUrl} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
        ) : null}
        <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/35">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-white/90 text-black">
            <Play className="size-6 translate-x-0.5" aria-hidden />
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="relative">
      <iframe
        // Remounted on a reload, and on a different post.
        key={`${embedUrl}:${attempt}`}
        src={embedUrl}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        // The player is a third party: it gets no access to this document
        // and no ability to navigate the page it is embedded in.
        sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
        referrerPolicy="strict-origin-when-cross-origin"
        className="aspect-[9/16] w-full border-0"
      />
      <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-black px-3 py-2 text-xs text-white/70">
        <span>Player blank or showing an error?</span>
        <span className="flex gap-3">
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="inline-flex cursor-pointer items-center gap-1 underline underline-offset-2 hover:text-white">
            <RotateCw className="size-3" aria-hidden />
            Reload
          </button>
          <a href={postUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">
            Open on {platformName}
          </a>
        </span>
      </div>
    </div>
  );
}
