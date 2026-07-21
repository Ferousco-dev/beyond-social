"use client";

import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";

const STAGES = ["Creating", "Sketching", "Storyboarding", "Rendering", "Adding captions"] as const;

export function GeneratingDraft() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStage((current) => (current + 1) % STAGES.length);
    }, 1200);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      className="relative mt-3 aspect-[9/16] w-56 overflow-hidden rounded-xl border border-hairline bg-paper"
      role="status"
      aria-label="Generating your video"
    >
      <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(var(--ink-soft)_1.1px,transparent_1.1px)] [background-size:15px_15px] [mask-image:radial-gradient(circle_at_center,black,transparent_72%)] motion-safe:animate-pulse" />
      <div className="absolute left-3 top-3">
        <Logo showWordmark={false} />
      </div>
      <div className="absolute inset-x-0 bottom-4 flex justify-center">
        <span className="text-shimmer text-sm font-medium">{STAGES[stage]}</span>
      </div>
    </div>
  );
}
