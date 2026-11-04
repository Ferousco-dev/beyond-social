import type { SuggestedAudience } from "@/features/generate-form/audience";
import type { Length } from "@/features/generate-form/pacing";

/** Where an approved analysis script waits for the video setup form. */
export const APPROVED_SCRIPT_KEY = "bs:approved-script";

export interface ApprovedScript {
  hook: string;
  main: string;
  dialogue: string;
  cta: string;
  /** The analysis's guess at who the video is for, to prefill the audience. */
  audience?: SuggestedAudience;
  /** The reference's look, to prefill the visual style. */
  style?: string;
  /** People heard in the reference; more than one suggests a conversation. */
  speakers?: number;
  /** The clip length chosen with the script, carried into the Format step. */
  seconds?: Length;
}
