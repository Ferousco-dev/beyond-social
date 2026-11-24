import type { Brief } from "./autofill-actions";
import { MIN_TURNS, newTurn, type GenerateFormValues } from "./types.ts";

/**
 * The form values a brief fills in. Empty answers leave the person's own
 * choice alone, so filling never wipes something they already set.
 */
export function valuesFromBrief(current: GenerateFormValues, brief: Brief): Partial<GenerateFormValues> {
  const keep = (next: string, previous: string): string => (next.trim() === "" ? previous : next.trim());
  const conversation = brief.speaker_mode === "conversation";
  const patch: Partial<GenerateFormValues> = {
    title: keep(brief.title, current.title),
    objective: keep(brief.objective, current.objective),
    purpose: keep(brief.purpose, current.purpose),
    audience: { gender: brief.audience.gender, ages: brief.audience.ages, interests: brief.audience.interests },
    product: keep(brief.product, current.product),
    language: keep(brief.language, current.language),
    platform: keep(brief.platform, current.platform),
    seconds: brief.seconds > 0 ? brief.seconds : current.seconds,
    visualStyle: keep(brief.visual_style, current.visualStyle),
    environment: keep(brief.environment, current.environment),
    contentKind: keep(brief.content_kind, current.contentKind),
    hook: keep(brief.hook, current.hook),
    scenes: keep(brief.scenes, current.scenes),
    dialogue: keep(brief.dialogue, current.dialogue),
    tone: keep(brief.tone, current.tone),
    cta: keep(brief.cta, current.cta),
    speakerMode: conversation ? "conversation" : "single",
    // A new plan is written for the new script, so an old one is dropped.
    storyboard: null,
    voiceover: null,
  };
  if (conversation && current.turns.length < MIN_TURNS) patch.turns = [newTurn(), newTurn()];
  if (brief.face_asset_id) patch.faceAssetId = brief.face_asset_id;
  if (brief.voice_asset_id) patch.voiceAssetId = brief.voice_asset_id;
  if (brief.product_asset_id) patch.productAssetId = brief.product_asset_id;
  if (brief.environment_asset_id) patch.environmentAssetId = brief.environment_asset_id;
  return patch;
}
