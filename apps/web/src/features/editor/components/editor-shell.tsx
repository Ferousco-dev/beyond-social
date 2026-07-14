"use client";

import { MessageSquare } from "lucide-react";
import { type Route } from "next";
import { useState, type ReactNode } from "react";

import { EditorChat } from "./editor-chat";
import { EditorPreview } from "./editor-preview";
import { EditorTimeline } from "./editor-timeline";
import { EditorToolPanel } from "./editor-tool-panel";
import { EditorTopBar } from "./editor-top-bar";

export function EditorShell({
  conversationId,
  title,
}: {
  conversationId: string;
  title: string;
}): ReactNode {
  const [chatOpen, setChatOpen] = useState(false);
  const backHref = `/dashboard/c/${conversationId}` as Route;

  return (
    <div className="flex h-dvh flex-col bg-canvas text-ink">
      <EditorTopBar backHref={backHref} title={title} />

      <div className="relative flex min-h-0 flex-1">
        <EditorToolPanel className="hidden lg:flex" />

        <div className="flex min-w-0 flex-1 flex-col">
          <EditorPreview />
          <EditorTimeline />
        </div>

        {chatOpen ? (
          <EditorChat
            onClose={() => setChatOpen(false)}
            className="absolute right-4 top-4 z-20 flex h-[calc(100%-2rem)] w-80 max-w-[calc(100%-2rem)]"
          />
        ) : (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            aria-label="Open chat"
            className="absolute bottom-6 right-6 z-20 inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-ink pl-4 pr-5 text-paper shadow-card transition-opacity hover:opacity-90"
          >
            <MessageSquare className="size-5" />
            <span className="text-sm font-medium">Chat</span>
          </button>
        )}
      </div>
    </div>
  );
}
