/** The New Video starting points, shared by the page and its client panel. */
export const NEW_VIDEO_OPTIONS = [
  { id: "trending", title: "Find trending videos", body: "Search video references, preview them, and choose one to analyze." },
  { id: "link", title: "Use an existing video", body: "Paste a link, then choose when Gemini analyzes it." },
  { id: "idea", title: "Start with my own idea", body: "Describe the video in four fields." },
  { id: "avatar", title: "Use a saved avatar", body: "Generate with a consented face and your own voice recording." },
] as const;

export type NewVideoOptionId = (typeof NEW_VIDEO_OPTIONS)[number]["id"];
