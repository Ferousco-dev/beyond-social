import {
  Building2,
  Clapperboard,
  Mic,
  Scissors,
  Send,
  Share2,
  type LucideIcon,
} from "lucide-react";
import { type Route } from "next";

/**
 * The path a new account walks.
 *
 * Ordered as the work actually happens rather than by importance: say what you
 * make videos about, make one, cut it, then the things that only matter once you
 * have something worth posting. A checklist that opens with "connect your TikTok
 * account" asks for a permission before it has earned one.
 *
 * Every step is completed by doing the real thing. None of them are marked off
 * by being read, and none of them can be ticked by hand, which is what stops
 * this from being a list of promises.
 */

export interface OnboardingStep {
  readonly id: OnboardingStepId;
  readonly title: string;
  /** What it is and why it is worth doing, in one breath. */
  readonly blurb: string;
  readonly action: string;
  readonly href: Route;
  readonly icon: LucideIcon;
}

export const ONBOARDING_STEP_IDS = [
  "industry",
  "generate",
  "edit",
  "voice",
  "connect",
  "publish",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: "industry",
    title: "Tell us your industry",
    blurb:
      "Everything the app suggests, from trends to starting prompts, narrows to what you actually sell.",
    action: "Choose industry",
    href: "/dashboard/settings/account" as Route,
    icon: Building2,
  },
  {
    id: "generate",
    title: "Make your first video",
    blurb: "Describe what you want, or start from a TikTok that is already working, and render it.",
    action: "Start a video",
    href: "/dashboard" as Route,
    icon: Clapperboard,
  },
  {
    id: "edit",
    title: "Cut it in the editor",
    blurb:
      "Open a video from your library, then use Edit in the chat header to trim, caption and grade it on the timeline.",
    // The library, honestly labelled. There is no route that opens the editor
    // without knowing which project, and a button saying "Open the editor" that
    // lands two hops away is worse than one that says where it goes.
    action: "Browse your videos",
    href: "/dashboard/library" as Route,
    icon: Scissors,
  },
  {
    id: "voice",
    title: "Save your voice",
    blurb: "Record once and have your videos speak in it, instead of a stock narrator.",
    action: "Record a sample",
    href: "/dashboard/settings/voice" as Route,
    icon: Mic,
  },
  {
    id: "connect",
    title: "Connect an account",
    blurb: "Link TikTok or Instagram so a finished video can go out without leaving the app.",
    action: "Connect",
    href: "/dashboard/settings/connections" as Route,
    icon: Share2,
  },
  {
    id: "publish",
    title: "Publish or schedule a post",
    blurb: "Send your first video out, or put it in the calendar for when your audience is awake.",
    action: "Open the schedule",
    href: "/dashboard/schedule" as Route,
    icon: Send,
  },
];
