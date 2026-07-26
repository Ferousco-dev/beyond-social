"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SUGGESTIONS } from "@/lib/dashboard/data";
import { buildGreeting } from "@/lib/dashboard/greetings";
import { cn } from "@/lib/utils";

import { PromptComposer } from "./prompt-composer";

export function DashboardHome({ name }: { name: string }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [greeting, setGreeting] = useState("");

  // Resolved on the client: the greeting depends on the visitor's own clock,
  // which the server cannot know without causing a hydration mismatch.
  useEffect(() => {
    const now = new Date();
    setGreeting(buildGreeting(name, now, now.getHours() + now.getDate()));
  }, [name]);

  function handleSubmit() {
    const text = prompt.trim();
    if (!text) return;
    window.sessionStorage.setItem("bs:pending-prompt", text);
    router.push("/dashboard/c/new");
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
        onSubmit={handleSubmit}
        // The thread has no project until the first message lands, so photos
        // are attached there rather than here.
        projectId="new"
        photos={[]}
        onPhotosChange={() => undefined}
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
    </div>
  );
}
