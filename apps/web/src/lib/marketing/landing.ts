import {
  BarChart3,
  CalendarClock,
  Clapperboard,
  Layers,
  Sparkles,
  Wand2,
  type LucideIcon,
} from "lucide-react";

/**
 * Landing page content. Copy and imagery live here so sections stay purely
 * presentational and the marketing message can be edited in one place.
 */

export interface Feature {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
}

export interface Step {
  readonly index: string;
  readonly title: string;
  readonly description: string;
}

export interface ShowcaseItem {
  readonly title: string;
  readonly meta: string;
  readonly image: string;
  readonly alt: string;
}

/** Unsplash CDN, sized and cropped at the edge. */
function unsplash(id: string, width: number, height: number): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
}

export const HERO_IMAGE = unsplash("photo-1611784728558-6c7d9b409cdf", 1200, 800);
export const HERO_IMAGE_ALT = "Creator filming with a professional video camera";

export const CTA_IMAGE = unsplash("photo-1603126004251-d01882b9bfd3", 1200, 900);
export const CTA_IMAGE_ALT = "Silhouette of a camera operator against a bright sky";

export const FEATURES: readonly Feature[] = [
  {
    icon: Wand2,
    title: "Prompt intelligence",
    description:
      "Every prompt is grounded in a knowledge base of cinematography, lighting, and retention craft, then rewritten into a director-grade shot description.",
  },
  {
    icon: Clapperboard,
    title: "Generation that understands film",
    description:
      "Shot size, camera movement, and lighting are specified for you, so clips look directed instead of generated.",
  },
  {
    icon: Layers,
    title: "An editor, not a black box",
    description:
      "Trim clips, restyle captions, swap music, and adjust the grade on a real multi-track timeline whenever the first cut is not quite right.",
  },
  {
    icon: CalendarClock,
    title: "Schedule once, publish everywhere",
    description:
      "Queue a week of content and let it publish itself to TikTok, Instagram, YouTube, and Facebook at the right moment.",
  },
  {
    icon: BarChart3,
    title: "Performance that feeds back",
    description:
      "Views and reach flow back into the engine, so the system learns which creative choices actually earned attention.",
  },
  {
    icon: Sparkles,
    title: "Gets sharper every week",
    description:
      "Accepted outputs strengthen the knowledge behind them. The model you use next month is better than the one you used today.",
  },
];

export const STEPS: readonly Step[] = [
  {
    index: "01",
    title: "Describe it, or drop a photo",
    description:
      "Say what you want in plain language, or start from a single product image. No storyboards, no timeline to learn first.",
  },
  {
    index: "02",
    title: "The engine directs the shot",
    description:
      "Your brief is grounded in real directing knowledge and turned into a scripted, shot-listed video with captions and music.",
  },
  {
    index: "03",
    title: "Refine, then publish",
    description:
      "Adjust anything in the editor, then schedule it to every platform in the formats each one rewards.",
  },
];

export const SHOWCASE: readonly ShowcaseItem[] = [
  {
    title: "Fragrance launch",
    meta: "Product video · 9:16",
    image: unsplash("photo-1666621630026-862eea07236c", 600, 900),
    alt: "Perfume bottle on a minimal surface",
  },
  {
    title: "Skincare drop",
    meta: "UGC ad · 9:16",
    image: unsplash("photo-1611930022073-b7a4ba5fcccd", 600, 900),
    alt: "Two minimal skincare bottles",
  },
  {
    title: "Eyewear campaign",
    meta: "Brand film · 9:16",
    image: unsplash("photo-1711564354308-77285d9fe3c7", 600, 900),
    alt: "Pair of glasses on a bright table",
  },
  {
    title: "Studio session",
    meta: "Behind the scenes · 9:16",
    image: unsplash("photo-1632187981988-40f3cbaeef5e", 600, 900),
    alt: "Film crew around a camera setup",
  },
];

export interface FaqItem {
  readonly question: string;
  readonly answer: string;
}

export const LANDING_FAQ: readonly FaqItem[] = [
  {
    question: "Do I need any video editing experience?",
    answer:
      "No. Describe what you want and the engine handles scripting, shots, captions, and music. The editor is there when you want control, not as a requirement.",
  },
  {
    question: "What makes the output different from other AI video tools?",
    answer:
      "Prompts are grounded in a curated knowledge base of cinematography, lighting, pacing, and platform craft before anything is generated, so clips read as directed rather than generic.",
  },
  {
    question: "Can I use my own product photos?",
    answer:
      "Yes. Start from a single image and the engine animates it while preserving your product's shape, colour, and label exactly.",
  },
  {
    question: "Which platforms can I publish to?",
    answer:
      "TikTok, Instagram, YouTube Shorts, and Facebook, each in the aspect ratio and length that platform rewards. Schedule once and it publishes itself.",
  },
  {
    question: "Does it really improve over time?",
    answer:
      "Yes. Every output you accept, edit, or reject updates the knowledge behind it, so retrieval surfaces the techniques that actually perform for your audience.",
  },
];
