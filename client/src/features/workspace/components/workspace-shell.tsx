"use client";

import { useCallback, useMemo, useState } from "react";
import { type Route } from "next";

import { ConversationThread, type SavedLikeness } from "@/features/dashboard/components/conversation-thread";
import { useComposerDraft } from "@/features/dashboard/hooks/use-composer-draft";
import { useEditorState } from "@/features/editor/hooks/use-editor-state";
import { usePlayback } from "@/features/editor/hooks/use-playback";
import { useAutosave } from "@/features/editor/hooks/use-autosave";
import { type Project } from "@/lib/editor/types";
import { type ChatMessage, type Thread } from "@/lib/chat/thread";

import { AssetPicker, type PickerAsset } from "./asset-picker";
import { WorkspaceAssistant } from "./workspace-assistant";
import { WorkspaceCanvas, type CanvasPreview, type CanvasTake } from "./workspace-canvas";
import { WorkspaceTopbar } from "./workspace-topbar";
import {
  draftPickerAssets,
  mergeAssets,
  messagePickerAssets,
  takesFromMessages,
} from "../lib/live-assets";

interface WorkspaceShellProps {
  readonly thread: Thread;
  readonly savedLikeness: SavedLikeness | null;
  readonly initialProject: Project;
  readonly initialRevision: number;
  readonly canSave: boolean;
  readonly conversationId: string;
  readonly userName: string;
  readonly pickerAssets: readonly PickerAsset[];
  readonly demoTakes?: readonly CanvasTake[];
}

function kindForUpload(file: File): string {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "voice";
  return "upload";
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
  demoTakes = [],
}: WorkspaceShellProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [uploads, setUploads] = useState<readonly PickerAsset[]>([]);
  const [preview, setPreview] = useState<CanvasPreview | null>(null);

  // Lifted so the picker sees unsent attachments the moment they are attached.
  const draft = useComposerDraft(thread.projectId);
  const [liveMessages, setLiveMessages] = useState<readonly ChatMessage[] | null>(null);
  const handleLiveMessages = useCallback(
    (messages: readonly ChatMessage[]) => setLiveMessages(messages),
    [],
  );
  const messages = liveMessages ?? thread.messages;

  const editor = useEditorState(initialProject);
  const playback = usePlayback(editor.durationMs);
  useAutosave({
    projectId: conversationId,
    project: editor.project,
    initialRevision,
    enabled: canSave,
  });

  const takes = useMemo(
    () => takesFromMessages(messages, query, demoTakes),
    [messages, query, demoTakes],
  );
  // Uploads, attachments, and renders first; the library behind them.
  const assets = useMemo(
    () =>
      mergeAssets(uploads, draftPickerAssets(draft), messagePickerAssets(messages), pickerAssets),
    [uploads, draft, messages, pickerAssets],
  );
  const isEmpty = thread.messages.length === 0 && demoTakes.length === 0;

  const handleUpload = useCallback((files: readonly File[]) => {
    const stamped = Date.now();
    const next = files.map((file, index) => ({
      id: `upload-${stamped}-${index}`,
      label: file.name === "" ? "Upload" : file.name,
      url: URL.createObjectURL(file),
      kind: kindForUpload(file),
    }));
    setUploads((current) => [...next, ...current]);
  }, []);

  const handleSelectAsset = useCallback((asset: PickerAsset) => {
    if (!asset.url) return;
    setPreview({ url: asset.url, label: asset.label, kind: asset.kind });
  }, []);

  const handlePreviewTake = useCallback((take: CanvasTake) => {
    if (!take.url) return;
    setPreview({ url: take.url, label: take.label, kind: "video" });
  }, []);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col bg-canvas text-ink lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <WorkspaceTopbar
          query={query}
          onQueryChange={setQuery}
          onOpenAssets={() => setPickerOpen((open) => !open)}
        />
        <WorkspaceCanvas
          projectId={conversationId}
          draft={draft}
          editor={editor}
          playback={playback}
          takes={takes}
          preview={preview}
          onPreviewTake={handlePreviewTake}
          onClearPreview={() => setPreview(null)}
          onOpenAssets={() => setPickerOpen(true)}
        />
      </div>

      <WorkspaceAssistant title={thread.title} userName={userName} isEmpty={isEmpty}>
        <ConversationThread
          thread={thread}
          savedLikeness={savedLikeness}
          showHeader={false}
          showIntro={false}
          // The timeline is on this same screen now, so draft menus stay here
          // instead of pointing at the switched-off separate editor.
          editorHref={`/dashboard/c/${conversationId}` as Route}
          draft={draft}
          onLiveMessages={handleLiveMessages}
        />
      </WorkspaceAssistant>

      <AssetPicker
        open={pickerOpen}
        query={query}
        onQueryChange={setQuery}
        assets={assets}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectAsset}
        onUpload={handleUpload}
      />
    </div>
  );
}
