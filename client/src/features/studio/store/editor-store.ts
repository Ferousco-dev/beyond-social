import { create } from "zustand";

import { commit, createHistory, redo, replacePresent, undo, type History } from "../core/history.ts";
import { projectDuration } from "../core/find.ts";
import { fitToFootage } from "../core/footage.ts";
import { type Project, type Result } from "../core/types.ts";
import { STUDIO_ZOOM } from "../config";
import { clamp } from "../lib/format";

export type ToolTab = "media" | "captions" | "text" | "images" | "music";
export type SaveStatus = "saved" | "pending" | "saving" | "error" | "conflict";
type Edit = (project: Project) => Result<Project>;

const COALESCE_MS = 1200;

interface StudioState {
  projectId: string | null;
  title: string;
  version: number;
  history: History<Project>;
  /** The project as last stored, so autosave can tell whether anything changed. */
  saved: Project | null;
  saveStatus: SaveStatus;
  /** The project a drag started from. While set, moves are previews, not history. */
  gestureBase: Project | null;
  /** The last edit that may still absorb the next one, so a slider drag is one undo step. */
  lastEdit: { key: string; at: number } | null;
  selection: string | null;
  /** Playable links for uploaded files, by media id. They expire, so they are refreshed. */
  mediaUrls: Record<string, string>;
  /** What the assistant learned from watching a clip, by item id. Only set when the user asked it to watch. */
  clipNotes: Record<string, string>;
  /** A short message about the last action that could not be done. */
  notice: string | null;
  /** The server's reason for the notice, when a plan limit caused it. */
  noticeCode: string | undefined;
  currentTime: number;
  playing: boolean;
  zoom: number;
  snapping: boolean;
  tool: ToolTab;

  load: (id: string, title: string, version: number, project: Project) => void;
  /** Applies an edit as one undo step. Returns the reason it failed, or null. */
  edit: (edit: Edit, key?: string) => string | null;
  /** Corrects clips that claim more footage than their file really has, once the file's length is known. Not an undo step. */
  fitFootage: (src: string, seconds: number) => void;
  /** Previews an edit from the drag's starting project without touching history. */
  drag: (edit: Edit) => void;
  endDrag: () => void;
  undo: () => void;
  redo: () => void;
  /** Puts edits kept on this device back in place; they save like any other change. */
  restoreDraft: (project: Project, title: string) => void;
  markSaved: (project: Project, version: number) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setTitle: (title: string) => void;
  select: (id: string | null) => void;
  setMediaUrls: (urls: Record<string, string>) => void;
  setClipNote: (itemId: string, note: string) => void;
  setNotice: (notice: string | null, code?: string) => void;
  seek: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  /** Plays or pauses; playing from the very end starts again from the beginning. */
  togglePlay: () => void;
  setClock: (time: number) => void;
  zoomBy: (factor: number) => void;
  setZoom: (zoom: number) => void;
  toggleSnapping: () => void;
  setTool: (tool: ToolTab) => void;
}

export const useStudio = create<StudioState>((set, get) => ({
  projectId: null,
  title: "",
  version: 1,
  history: createHistory<Project>({ version: 1, width: 1080, height: 1920, fps: 30, tracks: [] }),
  saved: null,
  saveStatus: "saved",
  gestureBase: null,
  lastEdit: null,
  selection: null,
  mediaUrls: {},
  clipNotes: {},
  notice: null,
  noticeCode: undefined,
  currentTime: 0,
  playing: false,
  zoom: STUDIO_ZOOM.DEFAULT,
  snapping: true,
  tool: "media",

  load: (id, title, version, project) =>
    set({
      projectId: id, title, version, history: createHistory(project), saved: project, saveStatus: "saved", clipNotes: {},
      gestureBase: null, lastEdit: null, selection: null, currentTime: 0, playing: false,
    }),

  edit: (edit, key) => {
    const { history, gestureBase, lastEdit } = get();
    const result = edit(gestureBase ?? history.present);
    if (!result.ok) {
      set({ notice: result.error });
      return result.error;
    }
    const now = Date.now();
    const merge = key !== undefined && lastEdit?.key === key && now - lastEdit.at < COALESCE_MS;
    set({
      history: merge ? replacePresent(history, result.value) : commit(history, result.value),
      gestureBase: null,
      lastEdit: key === undefined ? null : { key, at: now },
      saveStatus: "pending",
    });
    return null;
  },

  fitFootage: (src, seconds) => {
    const { history } = get();
    const fitted = fitToFootage(history.present, src, seconds);
    if (fitted === history.present) return;
    set({ history: replacePresent(history, fitted), saveStatus: "pending", notice: `A clip was shorter than recorded, so it now ends at its last frame (${seconds.toFixed(1)}s of footage).` });
  },

  drag: (edit) => {
    const { history, gestureBase } = get();
    const base = gestureBase ?? history.present;
    const result = edit(base);
    if (!result.ok) return;
    set({ gestureBase: base, history: { ...history, present: result.value } });
  },

  endDrag: () => {
    const { history, gestureBase } = get();
    if (!gestureBase) return;
    set({ gestureBase: null, history: commit({ ...history, present: gestureBase }, history.present), saveStatus: "pending" });
  },

  // Stepping through history ends any run of merged edits, so the next change is its own step.
  undo: () => set((s) => ({ history: undo(s.history), lastEdit: null, saveStatus: "pending" })),
  redo: () => set((s) => ({ history: redo(s.history), lastEdit: null, saveStatus: "pending" })),

  restoreDraft: (project, title) =>
    set((s) => ({ history: commit(s.history, project), title, lastEdit: null, saveStatus: "pending" })),

  markSaved: (project, version) =>
    set((s) => ({ saved: project, version, saveStatus: s.history.present === project ? "saved" : "pending" })),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setTitle: (title) => set({ title, saveStatus: "pending" }),

  select: (selection) => set({ selection }),
  setClipNote: (itemId, note) => set((s) => ({ clipNotes: { ...s.clipNotes, [itemId]: note } })),
  setMediaUrls: (urls) => set((s) => ({ mediaUrls: { ...s.mediaUrls, ...urls } })),
  setNotice: (notice, noticeCode) => set({ notice, noticeCode }),
  seek: (time) => set({ currentTime: clamp(time, 0, projectDuration(get().history.present) + 30) }),
  setPlaying: (playing) => set({ playing }),
  togglePlay: () => {
    const { playing, currentTime, history } = get();
    if (playing) return set({ playing: false });
    const duration = projectDuration(history.present);
    if (duration <= 0) return;
    set({ playing: true, ...(currentTime >= duration ? { currentTime: 0 } : {}) });
  },
  setClock: (currentTime) => set({ currentTime }),
  zoomBy: (factor) => set((s) => ({ zoom: clamp(s.zoom * factor, STUDIO_ZOOM.MIN, STUDIO_ZOOM.MAX) })),
  setZoom: (zoom) => set({ zoom: clamp(zoom, STUDIO_ZOOM.MIN, STUDIO_ZOOM.MAX) }),
  toggleSnapping: () => set((s) => ({ snapping: !s.snapping })),
  setTool: (tool) => set({ tool }),
}));

export const selectProject = (s: StudioState): Project => s.history.present;
