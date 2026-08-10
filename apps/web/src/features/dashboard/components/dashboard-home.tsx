"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { BriefFlow } from "@/features/brief/components/brief-flow";
import { SUGGESTIONS } from "@/lib/dashboard/data";
import { buildGreeting } from "@/lib/dashboard/greetings";
import { cn } from "@/lib/utils";

import { type PendingPhoto } from "./compose-menu";
import { PromptComposer } from "./prompt-composer";

/**
 * The first screen of a new video.
 *
 * Opens on the two ways in rather than on the composer. A blank textarea asks
 * for a finished thought before the person has had one, and the composer is
 * still one click away for anybody who arrived with theirs already formed.
 */
export function DashboardHome({ name }: { name: string }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [photos, setPhotos] = useState<readonly PendingPhoto[]>([]);
  const [greeting, setGreeting] = useState("");
  const [composing, setComposing] = useState(false);

  // Resolved on the client: the greeting depends on the visitor's own clock,
  // which the server cannot know without causing a hydration mismatch.
  useEffect(() => {
    const now = new Date();
    setGreeting(buildGreeting(name, now, now.getHours() + now.getDate()));
  }, [name]);

  const start = useCallback(
    (text: string, attachments: readonly PendingPhoto[] = []) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      window.sessionStorage.setItem("bs:pending-prompt", trimmed);
      // Photos are already uploaded and signed by this point, so only the
      // references travel. Without this the attachment was accepted here, shown
      // here, and then silently dropped by the navigation.
      if (attachments.length > 0) {
        window.sessionStorage.setItem("bs:pending-photos", JSON.stringify(attachments));
      }
      router.push("/dashboard/c/new");
    },
    [router],
  );

  if (!composing) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-12">
        <BriefFlow onSkip={() => setComposing(true)} onUse={(brief) => start(brief)} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-12">
      <h1
        aria-live="polite"
        className={cn(
          "mb-10 min-h-[2.5rem] text-balance text-center text-3xl font-semibold tracking-tight text-ink transition-opacity duration-500",
          greeting ? "opacity-100" : "opacity-0",
        )}
      >
        {greeting}
      </h1>

      <PromptComposer
        value={prompt}
        onChange={setPrompt}
        onSubmit={() => start(prompt, photos)}
        // There is no project yet, so an upload here is filed against none and
        // carried into the thread the first message creates.
        projectId="new"
        photos={photos}
        onPhotosChange={setPhotos}
        voice={null}
        footage={null}
        onFootage={() => {}}
        onVoice={() => undefined}
        shots={null}
        onShotsChange={() => {}}
        busy={false}
      />

      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion.label}
            type="button"
            onClick={() => setPrompt(suggestion.prompt)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-hairline bg-paper px-4 py-2.5 text-sm text-ink transition-colors hover:bg-cloud"
          >
            <suggestion.icon className="size-4 text-ink-soft" />
            {suggestion.label}
          </button>
        ))}
      </div>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setComposing(false)}
          className="cursor-pointer text-sm text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Back to the start
        </button>
      </div>
    </div>
  );
}
