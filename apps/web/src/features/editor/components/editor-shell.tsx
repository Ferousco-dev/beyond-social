"use client";

import { MessageSquare } from "lucide-react";
import { type Route } from "next";
import { useState, type ReactNode } from "react";

import { type Project } from "@/lib/editor/types";
import { cn } from "@/lib/utils";

import { useAutosave } from "../hooks/use-autosave";
import { useEditorState } from "../hooks/use-editor-state";
import { useEditorShortcuts } from "../hooks/use-editor-shortcuts";
import { usePlayback } from "../hooks/use-playback";
import { EditorChat } from "./editor-chat";
import { EditorPreview } from "./editor-preview";
import { EditorTimeline } from "./editor-timeline";
import { EditorToolPanel } from "./editor-tool-panel";
import { EditorTopBar } from "./editor-top-bar";

export function EditorShell({
  conversationId,
  title,
  initialProject,
  initialRevision,
  canSave,
}: {
  conversationId: string;
  title: string;
  initialProject: Project;
  initialRevision: number;
  /** False for an unsaved project or without a backend, so autosave stays off. */
  canSave: boolean;
}): ReactNode {
  const [chatOpen, setChatOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const editor = useEditorState(initialProject);
  const autosave = useAutosave({
    projectId: conversationId,
    project: editor.project,
    initialRevision,
    enabled: canSave,
  });
  const playback = usePlayback(editor.durationMs);
  const backHref = `/dashboard/c/${conversationId}` as Route;
  useEditorShortcuts(playback, editor);

  return (
    // The editor is part of the dark workspace; scope the dark tokens here too
    // so it stays consistent regardless of the global theme.
    <div className="dark flex h-dvh flex-col bg-canvas text-ink">
      <EditorTopBar
        backHref={backHref}
        title={title}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((open) => !open)}
        saveState={autosave.state}
        onRetrySave={autosave.saveNow}
      />

      {/* Panels sit above a timeline that spans the full window, as in a desktop editor. */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Chat floats over the player only, so it never covers the timeline. */}
        <div className="relative flex min-h-0 flex-1">
          <EditorToolPanel
            className={cn(
              // Below lg the panel overlays the player instead of squeezing it.
              "absolute inset-y-0 left-0 z-30 shadow-card lg:static lg:z-auto lg:flex lg:shadow-none",
              panelOpen ? "flex" : "hidden",
            )}
            editor={editor}
            playback={playback}
          />
          <EditorPreview playback={playback} editor={editor} />

          {chatOpen ? (
            <EditorChat
              onClose={() => setChatOpen(false)}
              editor={editor}
              className="absolute right-4 top-4 z-20 flex h-[calc(100%-2rem)] w-80 max-w-[calc(100%-2rem)]"
            />
          ) : (
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              aria-label="Open chat"
              className="absolute bottom-20 right-6 z-20 inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-ink pl-4 pr-5 text-paper shadow-card transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <MessageSquare className="size-5" />
              <span className="text-sm font-medium">Chat</span>
            </button>
          )}
        </div>

        <EditorTimeline playback={playback} editor={editor} />
      </div>
    </div>
  );
}
