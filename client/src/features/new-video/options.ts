/** The New Video starting points, shared by the page and its client panel. */
export const NEW_VIDEO_OPTIONS = [
  { id: "trending", title: "Find trending videos", body: "Search a topic, watch a few videos, and copy the idea of one." },
  { id: "link", title: "Use an existing video", body: "Paste a link and we write you a fresh script from it." },
  { id: "idea", title: "Start with my own idea", body: "Say what it is for in one line." },
  { id: "avatar", title: "Use a saved person", body: "Pick someone you saved. Their face and voice are filled in." },
] as const;

export type NewVideoOptionId = (typeof NEW_VIDEO_OPTIONS)[number]["id"];
