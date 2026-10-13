"use client";

import { useEffect } from "react";

import { type LibraryItem } from "@/lib/go-api/schemas";

import { parseProject } from "../core/validate.ts";
import { useAutosave } from "../hooks/use-autosave";
import { useMediaUrls } from "../hooks/use-media-urls";
import { useShortcuts } from "../hooks/use-shortcuts";
import { STUDIO_PANELS } from "../config";
import { useMediaQuery } from "../hooks/use-media-query";
import { useStudio } from "../store/editor-store";
import { DesktopOnly } from "./desktop-only";
import { PreviewPanel } from "./preview-panel";
import { RightPanel } from "./right-panel";
import { StudioHeader } from "./studio-header";
import { StudioLayout } from "./studio-layout";
import { Timeline } from "./timeline/timeline";
import { ToolPanel } from "./tool-panel";

interface StudioScreenProps {
  id: string;
  title: string;
  version: number;
  document: unknown;
  library: readonly LibraryItem[];
  /** Videos made by the chat this project came from. */
  chatLibrary: readonly LibraryItem[];
  backHref: string;
  plan: "free" | "pro";
}

export function StudioScreen({ id, title, version, document, library, chatLibrary, backHref, plan }: StudioScreenProps) {
  const parsed = parseProject(document);
  const loadedId = useStudio((s) => s.projectId);
  const desktop = useMediaQuery(STUDIO_PANELS.DESKTOP_QUERY);

  // The screen shows nothing until the store holds this project, so no panel ever reads a stale one.
  const project = parsed.ok ? parsed.value : null;
  useEffect(() => {
    if (project && useStudio.getState().projectId !== id) useStudio.getState().load(id, title, version, project);
  }, [id, title, version, project]);
  useEffect(() => () => useStudio.getState().setPlaying(false), []);
  useEffect(() => useStudio.getState().setPlan(plan), [plan]);
  useAutosave();
  useMediaUrls();
  useShortcuts();

  if (!desktop) return <DesktopOnly />;
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

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-canvas">
      <StudioHeader backHref={backHref} />
      <div className="min-h-0 flex-1">
        <StudioLayout
          tools={<ToolPanel library={library} chatLibrary={chatLibrary} />}
          preview={<PreviewPanel />}
          inspector={<RightPanel />}
          timeline={<Timeline />}
        />
      </div>
    </div>
  );
}
