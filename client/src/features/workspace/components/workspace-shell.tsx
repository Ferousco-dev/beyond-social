"use client";

import { useMemo, useState } from "react";

import { ConversationThread, type SavedLikeness } from "@/features/dashboard/components/conversation-thread";
import { useEditorState } from "@/features/editor/hooks/use-editor-state";
import { usePlayback } from "@/features/editor/hooks/use-playback";
import { useAutosave } from "@/features/editor/hooks/use-autosave";
import { type Project } from "@/lib/editor/types";
import { type Thread } from "@/lib/chat/thread";

import { AssetPicker, type PickerAsset } from "./asset-picker";
import { WorkspaceAssistant } from "./workspace-assistant";
import { WorkspaceCanvas, type CanvasTake } from "./workspace-canvas";
import { WorkspaceTopbar } from "./workspace-topbar";

interface WorkspaceShellProps {
  readonly thread: Thread;
  readonly savedLikeness: SavedLikeness | null;
  readonly initialProject: Project;
  readonly initialRevision: number;
  readonly canSave: boolean;
  readonly conversationId: string;
  readonly userName: string;
  readonly pickerAssets: readonly PickerAsset[];
}

function takesFromThread(thread: Thread, query: string): CanvasTake[] {
  const needle = query.trim().toLowerCase();
  const takes: CanvasTake[] = [];
  for (const message of thread.messages) {
    const draft = message.draft;
    if (!draft) continue;
    if (draft.status !== "ready" && draft.status !== "generating") continue;
    const label = message.content.slice(0, 48) || "Take";
    if (needle !== "" && !label.toLowerCase().includes(needle)) continue;
    takes.push({ id: draft.generationId, url: draft.resultUrl, label });
  }
  return takes;
}

export function WorkspaceShell({
  thread,
  savedLikeness,
  initialProject,
  initialRevision,
  canSave,
  conversationId,
  userName,
  pickerAssets,
}: WorkspaceShellProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const editor = useEditorState(initialProject);
  const playback = usePlayback(editor.durationMs);
  useAutosave({
    projectId: conversationId,
    project: editor.project,
    initialRevision,
    enabled: canSave,
  });

  const takes = useMemo(() => takesFromThread(thread, query), [thread, query]);
  const isEmpty = thread.messages.length === 0;

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col bg-canvas text-ink lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <WorkspaceTopbar
          query={query}
          onQueryChange={setQuery}
          onOpenAssets={() => setPickerOpen((open) => !open)}
        />
        <WorkspaceCanvas
          editor={editor}
          playback={playback}
          takes={takes}
          onOpenAssets={() => setPickerOpen(true)}
        />
      </div>

      <WorkspaceAssistant
        title={thread.title}
        userName={userName}
        isEmpty={isEmpty}
        onOpenAssets={() => setPickerOpen(true)}
      >
        <ConversationThread thread={thread} savedLikeness={savedLikeness} />
      </WorkspaceAssistant>

      <AssetPicker
        open={pickerOpen}
        query={query}
        onQueryChange={setQuery}
        assets={pickerAssets}
        onClose={() => setPickerOpen(false)}
        onSelect={() => setPickerOpen(false)}
      />
    </div>
  );
}
