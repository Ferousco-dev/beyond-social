"use client";

import { useEffect, useMemo, useState } from "react";

import { repairProject } from "../core/repair.ts";
import { parseProject } from "../core/validate.ts";
import { useAutosave } from "../hooks/use-autosave";
import { clearBackup, readBackup } from "../hooks/draft-backup";
import { rememberLinks, useMediaUrls } from "../hooks/use-media-urls";
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
  /** Links for the files the timeline plays, sent with the project so no separate request is needed. */
  mediaLinks?: Readonly<Record<string, { url: string; expiresAt: number }>>;
}

export function StudioScreen({ id, title, version, document, backHref, generation, mediaLinks }: StudioScreenProps) {
  // A project that fails the strict check is repaired on screen rather than refused. Nothing is
  // written back until the person makes a change, so the stored copy is untouched until then.
  const opened = useMemo(() => {
    const parsed = parseProject(document);
    if (parsed.ok) return { project: parsed.value, problems: [] as readonly string[], error: null };
    const repaired = repairProject(document);
    if (repaired) return { project: repaired.project, problems: repaired.problems, error: null };
    return { project: null, problems: [] as readonly string[], error: parsed.error };
  }, [document]);
  const [notedRepair, setNotedRepair] = useState(false);
  const loadedId = useStudio((s) => s.projectId);
  const desktop = useMediaQuery(STUDIO_PANELS.DESKTOP_QUERY);

  // The screen shows nothing until the store holds this project, so no panel ever reads a stale one.
  const project = opened.project;
  useEffect(() => {
    if (mediaLinks) rememberLinks(mediaLinks);
    if (project && useStudio.getState().projectId !== id) {
      useStudio.getState().load(id, title, version, project);
      // Edits kept on this device that never reached the server: bring them back, but only when
      // nobody has saved since (same version), so another tab's work is never overwritten.
      const backup = readBackup(id);
      if (backup && backup.version === version) {
        const kept = parseProject(backup.document);
        if (kept.ok && JSON.stringify(kept.value) !== JSON.stringify(project)) {
          useStudio.getState().restoreDraft(kept.value, backup.title.trim() || title);
          useStudio.getState().setNotice("Restored your unsaved changes from this device.");
        } else clearBackup(id);
      } else if (backup) clearBackup(id);
    }
  }, [id, title, version, project, mediaLinks]);
  useEffect(() => () => useStudio.getState().setPlaying(false), []);
  useAutosave();
  useMediaUrls();
  useShortcuts();

  if (opened.error !== null) {
    return (
      <div className="flex h-svh items-center justify-center p-6 text-center">
        <p role="alert" className="max-w-sm text-sm text-ink-soft">
          This project could not be opened: {opened.error}
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
      {opened.problems.length > 0 && !notedRepair ? (
        <div role="status" className="flex items-start gap-3 border-y border-hairline bg-cloud px-4 py-2 text-xs text-ink">
          <p className="min-w-0 flex-1">
            This project had problems, so it was repaired for display: {opened.problems.join(" ")} Your saved copy is unchanged until you make an edit.
          </p>
          <button type="button" onClick={() => setNotedRepair(true)} className="shrink-0 cursor-pointer font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary">
            Dismiss
          </button>
        </div>
      ) : null}
      {generation?.generator === "conversation" ? <ConversationJob /> : generation ? <LiveAvatarJob generation={generation} /> : null}
      <div className="min-h-0 flex-1">
        {desktop ? <StudioLayout {...panes} /> : <MobileStudioLayout {...panes} />}
      </div>
    </div>
  );
}
