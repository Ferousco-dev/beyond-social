import { create } from "zustand";

import { commit, createHistory, redo, undo, type History } from "../core/history.ts";
import { projectDuration } from "../core/find.ts";
import { type Project, type Result } from "../core/types.ts";
import { STUDIO_ZOOM } from "../config";
import { clamp } from "../lib/format";

export type ToolTab = "media" | "captions" | "text" | "images" | "audio";
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
  currentTime: number;
  playing: boolean;
  zoom: number;
  snapping: boolean;
  tool: ToolTab;

  load: (id: string, title: string, version: number, project: Project) => void;
  /** Applies an edit as one undo step. Returns the reason it failed, or null. */
  edit: (edit: Edit, key?: string) => string | null;
  /** Previews an edit from the drag's starting project without touching history. */
  drag: (edit: Edit) => void;
  endDrag: () => void;
  undo: () => void;
  redo: () => void;
  markSaved: (project: Project, version: number) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setTitle: (title: string) => void;
  select: (id: string | null) => void;
  setMediaUrls: (urls: Record<string, string>) => void;
  setClipNote: (itemId: string, note: string) => void;
  setNotice: (notice: string | null) => void;
  seek: (time: number) => void;
  setPlaying: (playing: boolean) => void;
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
  currentTime: 0,
  playing: false,
  zoom: STUDIO_ZOOM.DEFAULT,
  snapping: true,
  tool: "media",

  load: (id, title, version, project) =>
    set({
      projectId: id, title, version, history: createHistory(project), saved: project, saveStatus: "saved", clipNotes: {},
      gestureBase: null, selection: null, currentTime: 0, playing: false,
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
      history: merge ? { ...history, present: result.value } : commit(history, result.value),
      gestureBase: null,
      lastEdit: key === undefined ? null : { key, at: now },
      saveStatus: "pending",
    });
    return null;
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

  undo: () => set((s) => ({ history: undo(s.history), saveStatus: "pending" })),
  redo: () => set((s) => ({ history: redo(s.history), saveStatus: "pending" })),

  markSaved: (project, version) =>
    set((s) => ({ saved: project, version, saveStatus: s.history.present === project ? "saved" : "pending" })),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setTitle: (title) => set({ title, saveStatus: "pending" }),

  select: (selection) => set({ selection }),
  setClipNote: (itemId, note) => set((s) => ({ clipNotes: { ...s.clipNotes, [itemId]: note } })),
  setMediaUrls: (urls) => set((s) => ({ mediaUrls: { ...s.mediaUrls, ...urls } })),
  setNotice: (notice) => set({ notice }),
  seek: (time) => set({ currentTime: clamp(time, 0, projectDuration(get().history.present) + 30) }),
  setPlaying: (playing) => set({ playing }),
  setClock: (currentTime) => set({ currentTime }),
  zoomBy: (factor) => set((s) => ({ zoom: clamp(s.zoom * factor, STUDIO_ZOOM.MIN, STUDIO_ZOOM.MAX) })),
  setZoom: (zoom) => set({ zoom: clamp(zoom, STUDIO_ZOOM.MIN, STUDIO_ZOOM.MAX) }),
  toggleSnapping: () => set((s) => ({ snapping: !s.snapping })),
  setTool: (tool) => set({ tool }),
}));

export const selectProject = (s: StudioState): Project => s.history.present;
