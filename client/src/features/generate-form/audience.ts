import { AGE_RANGES, GENDER_OPTIONS } from "./options";

export type AudienceGender = "any" | "female" | "male";

/** Who the video is for, as options rather than free text. */
export interface AudienceChoice {
  gender: AudienceGender;
  /** Values from AGE_RANGES; empty means any age. */
  ages: string[];
  interests: string[];
}

/** An analysis's guess at the audience, before it becomes a choice. */
export interface SuggestedAudience {
  readonly gender: AudienceGender;
  readonly ageMin: number;
  readonly ageMax: number;
  readonly interests: readonly string[];
}

export const EMPTY_AUDIENCE: AudienceChoice = { gender: "any", ages: [], interests: [] };

export const MAX_INTERESTS = 8;

/** Every age bracket the suggested range touches is preselected. */
export function fromSuggestion(suggestion: SuggestedAudience): AudienceChoice {
  return {
    gender: suggestion.gender,
    ages: AGE_RANGES.filter((range) => range.min <= suggestion.ageMax && range.max >= suggestion.ageMin).map((range) => range.value),
    interests: suggestion.interests.slice(0, MAX_INTERESTS),
  };
}

/** Drafts saved before the audience had options stored it as a sentence. */
export function toAudience(saved: unknown): AudienceChoice {
  if (typeof saved === "string") return saved.trim() === "" ? EMPTY_AUDIENCE : { ...EMPTY_AUDIENCE, interests: [saved.trim()] };
  if (typeof saved !== "object" || saved === null) return EMPTY_AUDIENCE;
  const value = saved as Partial<AudienceChoice>;
  return {
    gender: value.gender === "female" || value.gender === "male" ? value.gender : "any",
    ages: Array.isArray(value.ages) ? value.ages.filter((age) => AGE_RANGES.some((range) => range.value === age)) : [],
    interests: Array.isArray(value.interests) ? value.interests.filter((item) => typeof item === "string").slice(0, MAX_INTERESTS) : [],
  };
}

/** The audience as one line for the brief and the review, or "" when nothing narrows it. */
export function audienceLabel(audience: AudienceChoice): string {
  const parts = [
    audience.gender === "any" ? "" : (GENDER_OPTIONS.find((option) => option.value === audience.gender)?.label ?? ""),
    audience.ages.length > 0 ? `aged ${audience.ages.join(", ")}` : "",
    audience.interests.length > 0 ? `into ${audience.interests.join(", ")}` : "",
  ].filter(Boolean);
  return parts.join(" ");
}
