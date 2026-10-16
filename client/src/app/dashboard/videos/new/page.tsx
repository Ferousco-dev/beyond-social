import { type Metadata } from "next";
import { type ReactNode } from "react";

import { goApi } from "@/lib/go-api/client";
import { creditsResponse } from "@/lib/go-api/schemas";
import { GenerateFormShell } from "@/features/generate-form/generate-form-shell";

export const metadata: Metadata = { title: "Configure video" };

/**
 * Main generation page: the 5-step form. Selections that need a backend read
 * it here; the brief and approved script arrive from the New Video flow
 * through the browser.
 */
export default async function VideosNewPage(): Promise<ReactNode> {
  const credits = await goApi("/api/v1/credits", creditsResponse);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Configure video</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Five steps, then review and generate. Your answers save as you go.
      </p>
      <div className="mt-6">
        <GenerateFormShell balance={credits.ok ? credits.data.data.balance : null} />
      </div>
    </div>
  );
}
