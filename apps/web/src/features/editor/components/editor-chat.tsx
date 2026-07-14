"use client";

import { type Route } from "next";
import { useState } from "react";

import { MessageBubble } from "@/features/dashboard/components/message-bubble";
import { PromptComposer } from "@/features/dashboard/components/prompt-composer";
import { SAMPLE_MESSAGES } from "@/lib/dashboard/conversations";
import { cn } from "@/lib/utils";

export function EditorChat({ className }: { className?: string }) {
  const [prompt, setPrompt] = useState("");

  return (
    <div
      className={cn(
        "flex-col overflow-hidden rounded-2xl border border-hairline bg-paper shadow-card",
        className,
      )}
    >
      <div className="border-b border-hairline px-4 py-2.5">
        <span className="text-sm font-medium text-ink">Chat</span>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {SAMPLE_MESSAGES.map((message) => (
          <MessageBubble key={message.id} message={message} editorHref={"/editor/p1" as Route} />
        ))}
      </div>
      <div className="border-t border-hairline p-3">
        <PromptComposer value={prompt} onChange={setPrompt} onSubmit={() => setPrompt("")} />
      </div>
    </div>
  );
}
