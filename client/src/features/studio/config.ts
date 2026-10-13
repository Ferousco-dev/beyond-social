export const STUDIO_ZOOM = { MIN: 8, MAX: 240, DEFAULT: 40, STEP: 1.25 } as const;

export const STUDIO_TIMELINE = {
  RULER_HEIGHT: 24,
  LABELS_WIDTH: 104,
  TRACK_GAP: 6,
  TRACK_HEIGHTS: { caption: 26, overlay: 30, video: 44, audio: 34 },
  MIN_LABEL_SPACING: 72,
  LABEL_STEPS: [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300],
  MINOR_TICKS_PER_LABEL: 5,
  TAIL_SECONDS: 4,
  SNAP_THRESHOLD_PX: 8,
} as const;

export const STUDIO_PANELS = {
  MAIN: { DEFAULT: "64", MIN: "30", MAX: "85" },
  TIMELINE: { DEFAULT: "36", MIN: "18", MAX: "70" },
  TOOLS: { DEFAULT: "24", MIN: "16", MAX: "40" },
  PREVIEW: { DEFAULT: "52", MIN: "30" },
  INSPECTOR: { DEFAULT: "24", MIN: "16", MAX: "40" },
  STORAGE_KEY: "studio-layout",
  DESKTOP_QUERY: "(min-width: 1024px)",
} as const;

export const STUDIO_SAVE = { DEBOUNCE_MS: 800 } as const;

/** Seconds given to a clip that has no known length yet. */
export const NEW_ITEM_SECONDS = 3;
