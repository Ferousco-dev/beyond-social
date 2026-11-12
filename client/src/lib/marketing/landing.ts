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
  /**
   * A screen peeking in from the card's right edge.
   *
   * Only on the cards wide enough to carry one. Decoration rather than
   * documentation: it is clipped, faded and rotated, and is there to suggest a
   * real product behind the claim rather than to be read.
   */
  readonly peek?: { readonly src: string; readonly alt: string };
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

export const CTA_IMAGE = unsplash("photo-1603126004251-d01882b9bfd3", 1200, 900);
export const CTA_IMAGE_ALT = "Silhouette of a camera operator against a bright sky";

export const FEATURES: readonly Feature[] = [
  {
    icon: Wand2,
    title: "Prompt intelligence",
    description:
      "Your prompt is checked against a knowledge base of cinematography, lighting and pacing, then rewritten as a detailed shot description.",
    peek: { src: "/app/compose.png", alt: "" },
  },
  {
    icon: Clapperboard,
    title: "Shots with camera and lighting set",
    description:
      "Shot size, camera movement and lighting are filled in for you, so clips look planned.",
  },
  {
    icon: Layers,
    title: "A real editor",
    description:
      "Trim clips, restyle captions, swap music and adjust the grade on a multi-track timeline when the first cut needs work.",
  },
  {
    icon: CalendarClock,
    title: "Schedule once",
    description:
      "Queue a week of posts and they go out to TikTok, Instagram and YouTube at the times you pick.",
    peek: { src: "/app/library.png", alt: "" },
  },
  {
    icon: BarChart3,
    title: "Results that feed back",
    description:
      "Views and likes come back into the app, so you can see which videos earned attention.",
    peek: { src: "/app/overview.png", alt: "" },
  },
  {
    icon: Sparkles,
    title: "Learns from what you keep",
    description:
      "Outputs you accept, edit or reject update the knowledge behind your next prompts.",
  },
];

export const STEPS: readonly Step[] = [
  {
    index: "01",
    title: "Describe it or drop in a photo",
    description:
      "Say what you want in plain language, or start from one product image.",
  },
  {
    index: "02",
    title: "The engine plans the shots",
    description:
      "Your brief becomes a script and a shot list, with captions and music.",
  },
  {
    index: "03",
    title: "Edit, then publish",
    description:
      "Change anything in the editor, then schedule it to your connected accounts in each platform's format.",
  },
];

/**
 * Sample output.
 *
 * ============================ PLACEHOLDER ============================
 * Every tile below is a stock photograph, and the section labels them as
 * things this product made: "Fragrance launch, product video, 9:16".
 * A visitor reads four finished videos. There are none.
 *
 * That is the same claim a fabricated testimonial makes, and it is worse
 * for being the thing they came to judge: nobody buys a video tool
 * without looking at its output. Replace these with real renders, with
 * the briefs that produced them, and set the flag below to false.
 *
 * `SHOWCASE_IS_PLACEHOLDER` is read by the component, which refuses to
 * render the section while it is true. The page is shorter without it,
 * which is the honest length.
 * =====================================================================
 */
export const SHOWCASE_IS_PLACEHOLDER = true;

export const SHOWCASE: readonly ShowcaseItem[] = [
  {
    title: "Replace me",
    meta: "Real render · 9:16",
    image: unsplash("photo-1666621630026-862eea07236c", 600, 900),
    alt: "Placeholder, not product output",
  },
  {
    title: "Replace me",
    meta: "Real render · 9:16",
    image: unsplash("photo-1611930022073-b7a4ba5fcccd", 600, 900),
    alt: "Placeholder, not product output",
  },
  {
    title: "Replace me",
    meta: "Real render · 9:16",
    image: unsplash("photo-1711564354308-77285d9fe3c7", 600, 900),
    alt: "Placeholder, not product output",
  },
  {
    title: "Replace me",
    meta: "Real render · 9:16",
    image: unsplash("photo-1632187981988-40f3cbaeef5e", 600, 900),
    alt: "Placeholder, not product output",
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
      "No. Describe what you want and the engine writes the script and picks shots, captions and music. Open the editor when you want to change something.",
  },
  {
    question: "How is this different from other AI video tools?",
    answer:
      "Before anything is generated, your prompt is checked against a knowledge base of cinematography, lighting and pacing. That is what gives clips a planned look.",
  },
  {
    question: "Can I use my own product photos?",
    answer:
      "Yes. Start from one image and the engine animates it, keeping your product's shape, colour and label.",
  },
  {
    question: "Which platforms can I publish to?",
    answer:
      "TikTok, Instagram and YouTube. Each post goes out in that platform's format, at the time you schedule.",
  },
  {
    question: "What happens when my credits run out?",
    answer:
      "You are told the cost of a video before it starts, and nothing is charged if you do not have enough. Credits do not expire, and they are returned if a video fails to render.",
  },
  {
    question: "Can I cancel Pro whenever I want?",
    answer:
      "Yes. Open Billing and choose Manage subscription to cancel or change your card yourself. There is no call or email to send.",
  },
  {
    question: "Does it improve over time?",
    answer:
      "Yes. Every output you accept, edit or reject updates the knowledge behind it, so later prompts lean on what worked for you.",
  },
];
