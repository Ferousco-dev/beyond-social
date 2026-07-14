"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SUGGESTIONS } from "@/lib/dashboard/data";

import { PromptComposer } from "./prompt-composer";

export function DashboardHome() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  function handleSubmit() {
    const text = prompt.trim();
    if (!text) return;
    window.sessionStorage.setItem("bs:pending-prompt", text);
    router.push("/dashboard/c/new");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-12">
      <h1 className="mb-10 text-center text-3xl font-semibold tracking-tight text-ink">
        Ready when you are
      </h1>

      <PromptComposer value={prompt} onChange={setPrompt} onSubmit={handleSubmit} />

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
