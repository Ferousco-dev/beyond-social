/** Preset answers offered in place of open text boxes. */

type Option = { readonly value: string; readonly label: string };

const same = (labels: readonly string[]): readonly Option[] => labels.map((label) => ({ value: label, label }));

export const CTA_OPTIONS = same([
  "Follow for more",
  "Contact me",
  "Shop now, link in bio",
  "Book a call",
  "Visit our website",
  "Comment below",
  "Send me a DM",
]);

export const MUSIC_OPTIONS: readonly Option[] = [
  { value: "", label: "No music" },
  ...same(["Upbeat pop", "Lo-fi chill", "Cinematic", "Corporate", "Acoustic", "Hip-hop", "Ambient"]),
];

export const STYLE_OPTIONS = same([
  "Bright and clean",
  "Cinematic",
  "Handheld, UGC feel",
  "Minimal studio",
  "Warm and natural",
  "Bold and high energy",
]);

export const ENVIRONMENT_OPTIONS = same(["Home", "Studio", "Office", "Outdoors", "Cafe", "Gym", "Store front"]);

export const GENDER_OPTIONS: readonly Option[] = [
  { value: "any", label: "Anyone" },
  { value: "female", label: "Women" },
  { value: "male", label: "Men" },
];

export const AGE_RANGES = [
  { value: "13-17", min: 13, max: 17 },
  { value: "18-24", min: 18, max: 24 },
  { value: "25-34", min: 25, max: 34 },
  { value: "35-44", min: 35, max: 44 },
  { value: "45-54", min: 45, max: 54 },
  { value: "55+", min: 55, max: 120 },
] as const;

export const INTEREST_SUGGESTIONS = ["Fitness", "Beauty", "Fashion", "Food", "Tech", "Travel", "Finance", "Parenting", "Gaming"] as const;
