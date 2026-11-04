import { audienceLabel } from "./audience";
import { purposeLabel, type GenerateFormValues } from "./types";

/** The prompt a generated clip is made from. */
export function buildPrompt(values: GenerateFormValues): string {
  const parts = [
    values.objective !== "" ? `Objective: ${values.objective}` : "",
    purposeLabel(values) !== "" ? `Purpose: ${purposeLabel(values)}` : "",
    audienceLabel(values.audience) !== "" ? `Target audience: ${audienceLabel(values.audience)}` : "",
    values.platform !== "" ? `Format for ${values.platform}` : "",
    values.country !== "" ? `Market: ${values.country}` : "",
    values.visualStyle,
    values.environment !== "" ? `Setting: ${values.environment}` : "",
    values.contentKind !== "" ? `${values.contentKind} video` : "",
    values.hook !== "" ? `Opens with: ${values.hook}` : "",
    values.scenes,
    values.dialogue !== "" ? `Says: ${values.dialogue}` : "",
    values.language !== "" ? `In ${values.language}` : "",
    values.tone !== "" ? `Tone: ${values.tone}` : "",
    values.cta !== "" ? `Ends with: ${values.cta}` : "",
    values.product !== "" ? `Featuring: ${values.product}` : "",
    values.music !== "" ? `Music: ${values.music}` : "",
  ];
  return parts.map((part) => part.trim()).filter((part) => part !== "").join("\n");
}

/** What a saved avatar says, in order. */
export function buildAvatarScript(values: GenerateFormValues): string {
  return [values.hook, values.dialogue, values.cta].map((part) => part.trim()).filter(Boolean).join("\n");
}

/**
 * Direction for a lip-synced video. The speech comes from the recording, so
 * the model is told only how the person looks, moves and is framed; giving it
 * the script or the marketing brief invites mouth shapes the audio never makes.
 */
export function avatarDirection(values: GenerateFormValues): string {
  return [
    `${values.tone || "Natural"} delivery, speaking straight to camera`,
    "lips and jaw follow the voice exactly, relaxed natural blinking and small head movements",
    "steady framing, head and shoulders",
    values.visualStyle,
    values.environment !== "" ? `Setting: ${values.environment}` : "",
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(". ");
}
