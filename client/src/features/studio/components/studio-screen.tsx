"use client";

import { useEffect } from "react";


import { parseProject } from "../core/validate.ts";
import { useAutosave } from "../hooks/use-autosave";
import { useMediaUrls } from "../hooks/use-media-urls";
import { useShortcuts } from "../hooks/use-shortcuts";
import { STUDIO_PANELS } from "../config";
import { useMediaQuery } from "../hooks/use-media-query";
import { useStudio } from "../store/editor-store";
import { MobileStudioLayout } from "./mobile-studio-layout";
import { PreviewPanel } from "./preview-panel";
import { RightPanel } from "./right-panel";
import { StudioHeader } from "./studio-header";
import { StudioLayout } from "./studio-layout";
import { Timeline } from "./timeline/timeline";
import { ToolPanel } from "./tool-panel";
import { ConversationJob } from "./conversation-job";
import { LiveAvatarJob } from "./live-avatar-job";
import { type ProjectGeneration } from "../core/types.ts";

interface StudioScreenProps {
  id: string;
  title: string;
  version: number;
  document: unknown;
  backHref: string;
  generation?: ProjectGeneration;
}

export function StudioScreen({ id, title, version, document, backHref, generation }: StudioScreenProps) {
  const parsed = parseProject(document);
  const loadedId = useStudio((s) => s.projectId);
  const desktop = useMediaQuery(STUDIO_PANELS.DESKTOP_QUERY);

  // The screen shows nothing until the store holds this project, so no panel ever reads a stale one.
  const project = parsed.ok ? parsed.value : null;
  useEffect(() => {
    if (project && useStudio.getState().projectId !== id) useStudio.getState().load(id, title, version, project);
  }, [id, title, version, project]);
  useEffect(() => () => useStudio.getState().setPlaying(false), []);
  useAutosave();
  useMediaUrls();
  useShortcuts();

  if (!parsed.ok) {
    return (
      <div className="flex h-svh items-center justify-center p-6 text-center">
        <p role="alert" className="max-w-sm text-sm text-ink-soft">
          This project could not be opened: {parsed.error}
        </p>
      </div>
    );
  }
  if (loadedId !== id) return null;

  const panes = {
    tools: <ToolPanel />,
    preview: <PreviewPanel />,
    inspector: <RightPanel />,
    timeline: <Timeline />,
  };

  return (
    <div className="relative flex h-svh flex-col overflow-hidden bg-canvas">
      <StudioHeader backHref={backHref} />
      {generation?.generator === "conversation" ? <ConversationJob /> : generation ? <LiveAvatarJob generation={generation} /> : null}
      <div className="min-h-0 flex-1">
        {desktop ? <StudioLayout {...panes} /> : <MobileStudioLayout {...panes} />}
      </div>
    </div>
  );
}
