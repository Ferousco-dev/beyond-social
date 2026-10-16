export interface GenerateFormValues {
  purpose: string;
  objective: string;
  audience: string;
  product: string;
  country: string;
  language: string;
  platform: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  seconds: number;
  visualStyle: string;
  contentKind: string;
  hook: string;
  scenes: string;
  dialogue: string;
  tone: string;
  cta: string;
  music: string;
  firstFrameId: string;
  avatarId: string;
  notifyEmail: boolean;
}

export const EMPTY_FORM: GenerateFormValues = {
  purpose: "",
  objective: "",
  audience: "",
  product: "",
  country: "",
  language: "English",
  platform: "TikTok",
  aspectRatio: "9:16",
  seconds: 8,
  visualStyle: "",
  contentKind: "mixed",
  hook: "",
  scenes: "",
  dialogue: "",
  tone: "Natural",
  cta: "",
  music: "",
  firstFrameId: "",
  avatarId: "",
  notifyEmail: false,
};

export const STEPS = ["Objective", "Format", "Script & speech", "Visual assets", "Final review"] as const;

export const PURPOSES = ["Promotion", "Brand awareness", "Education", "Product demonstration", "Other"] as const;
export const PLATFORMS = ["TikTok", "Instagram Reels"] as const;
export const RATIOS = ["9:16", "16:9", "1:1"] as const;
export const CONTENT_KINDS = ["Human-led", "Product-focused", "Mixed"] as const;
export const TONES = ["Natural", "Energetic", "Calm", "Authoritative", "Playful"] as const;
