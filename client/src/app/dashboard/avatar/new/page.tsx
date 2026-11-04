import { type Metadata } from "next";
import { type ReactNode } from "react";

import { LiveAvatarFlow } from "@/features/live-avatar-flow/flow-shell";

export const metadata: Metadata = { title: "Live Avatar" };

/**
 * Live Avatar: pick a group, upload face, voice, product and setting, answer
 * four brief questions, write the prompt, and generate. Uploads only.
 */
export default function LiveAvatarPage(): ReactNode {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Live Avatar</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Build an asset group once, then reuse it for every video. Nothing is recorded here.
      </p>
      <div className="mt-6">
        <LiveAvatarFlow />
      </div>
    </div>
  );
}
