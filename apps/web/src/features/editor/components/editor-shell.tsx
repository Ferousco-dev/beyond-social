import { type Route } from "next";
import { type ReactNode } from "react";

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

        {/* Floating chat, docked to the right on desktop only. */}
        <EditorChat className="absolute right-4 top-4 hidden h-[calc(100%-2rem)] w-80 lg:flex" />
      </div>
    </div>
  );
}
