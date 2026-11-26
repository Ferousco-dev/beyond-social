import { EMPTY_AUDIENCE, type AudienceChoice } from "./audience.ts";
import type { Storyboard, Voiceover } from "./storyboard.ts";
import { DEFAULT_VOICE } from "./voices.ts";

/** One line of a conversation: who says it, in which saved voice, and the words. */
export interface ConversationTurn {
  id: string;
  faceAssetId: string;
  voiceAssetId: string;
  words: string;
}

export const MIN_TURNS = 2;
export const MAX_TURNS = 6;

export function newTurn(): ConversationTurn {
  return { id: crypto.randomUUID(), faceAssetId: "", voiceAssetId: "", words: "" };
}

export interface GenerateFormValues {
  /** Optional project name shown in the sidebar and editor header. */
  title: string;
  /** The idea our AI filled the form from, kept so the script can be rewritten for a new length. */
  idea: string;
  purpose: string;
  /** What the person typed when the purpose is Other. */
  purposeOther: string;
  objective: string;
  audience: AudienceChoice;
  product: string;
  country: string;
  language: string;
  platform: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  seconds: number;
  visualStyle: string;
  environment: string;
  contentKind: string;
  hook: string;
  scenes: string;
  dialogue: string;
  tone: string;
  cta: string;
  /** The media the clip starts from: the chosen face, product or environment picture. */
  firstFrameId: string;
  faceAssetId: string;
  voiceAssetId: string;
  productAssetId: string;
  environmentAssetId: string;
  /** One person, or several people taking turns. */
  speakerMode: "single" | "conversation";
  turns: ConversationTurn[];
  notifyEmail: boolean;
  /** The plan for a long video, written for the chosen length and editable before rendering. */
  storyboard: Storyboard | null;
  /** The one recording read over a long video's silent shots. */
  voiceover: Voiceover | null;
  /** The voice that reads a long video's voiceover. */
  voice: string;
  /** Anything else the person wants, in their words. Folded into the brief by our AI on Generate. */
  extras: string;
}

export const EMPTY_FORM: GenerateFormValues = {
  title: "",
  idea: "",
  purpose: "promotion",
  purposeOther: "",
  objective: "",
  audience: EMPTY_AUDIENCE,
  product: "",
  country: "",
  language: "English",
  platform: "TikTok",
  aspectRatio: "9:16",
  seconds: 8,
  visualStyle: "",
  environment: "",
  contentKind: "Mixed",
  hook: "",
  scenes: "",
  dialogue: "",
  tone: "Natural",
  cta: "",
  firstFrameId: "",
  faceAssetId: "",
  voiceAssetId: "",
  productAssetId: "",
  environmentAssetId: "",
  speakerMode: "single",
  turns: [],
  notifyEmail: false,
  storyboard: null,
  voiceover: null,
  voice: DEFAULT_VOICE,
  extras: "",
};

export const PLATFORMS = ["TikTok", "Instagram Reels"] as const;
export const RATIOS = ["9:16", "16:9", "1:1"] as const;
export const CONTENT_KINDS = ["Human-led", "Product-focused", "Mixed"] as const;
export const TONES = ["Natural", "Energetic", "Calm", "Authoritative", "Playful"] as const;

/** The purpose as it should read in the brief: the typed one when Other is chosen. */
export function purposeLabel(values: Pick<GenerateFormValues, "purpose" | "purposeOther">): string {
  return values.purpose === "other" ? values.purposeOther.trim() : values.purpose;
}

/** A face and a voice together make a talking video lip-synced to the saved recording. */
export function isTalking(values: Pick<GenerateFormValues, "faceAssetId" | "voiceAssetId">): boolean {
  return values.faceAssetId !== "" && values.voiceAssetId !== "";
}

/** A conversation is ready when every turn has a face, a voice and its words. */
export function turnsReady(turns: readonly ConversationTurn[]): boolean {
  return turns.length >= MIN_TURNS && turns.every((turn) => turn.faceAssetId !== "" && turn.voiceAssetId !== "" && turn.words.trim() !== "");
}
