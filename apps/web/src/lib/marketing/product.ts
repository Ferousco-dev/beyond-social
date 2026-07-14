import {
  CalendarClock,
  Clapperboard,
  Hash,
  MessagesSquare,
  Scissors,
  TrendingUp,
} from "lucide-react";

import { type Benefit, type Feature, type WorkflowStep } from "./types";

export const FEATURES: readonly Feature[] = [
  {
    icon: MessagesSquare,
    title: "Conversational creation",
    description:
      "Describe the video you want in plain language. Beyond Social asks the right questions and turns the answer into a finished clip.",
  },
  {
    icon: Clapperboard,
    title: "Ultra-realistic video",
    description:
      "Generate talking-avatar and product videos from your own photos with a WAN-class model. No cameras, no crew, no studio.",
  },
  {
    icon: Scissors,
    title: "In-browser editor",
    description:
      "Trim, caption, adjust scenes, and drop in music on a timeline that feels like CapCut, without leaving the tab.",
  },
  {
    icon: CalendarClock,
    title: "AI scheduling",
    description:
      "Every post is scheduled for the moment your audience is most active, per platform, based on real engagement patterns.",
  },
  {
    icon: TrendingUp,
    title: "Trend discovery",
    description:
      "A live feed surfaces trending formats and topics in your niche, so you always have the next idea ready to generate.",
  },
  {
    icon: Hash,
    title: "Captions and hashtags",
    description:
      "Auto-generated captions, subtitles, and platform-specific hashtags are written for every clip you publish.",
  },
];

export const AI_WORKFLOW: readonly WorkflowStep[] = [
  {
    title: "Describe the idea",
    description:
      "Start a conversation or pick a suggestion from your trend feed. No brief required.",
  },
  {
    title: "AI writes the script",
    description:
      "Claude drafts the hook, script, and shot direction, tuned to the platform and format.",
  },
  {
    title: "Generate the video",
    description:
      "Your photos become an ultra-realistic clip in the background while you keep working.",
  },
];

export const PUBLISH_WORKFLOW: readonly WorkflowStep[] = [
  {
    title: "Caption and format",
    description:
      "Each clip is captioned, subtitled, and reformatted for every destination automatically.",
  },
  {
    title: "Find the best time",
    description:
      "Scheduling recommends the highest-engagement slot per platform, not a generic guess.",
  },
  {
    title: "Publish everywhere",
    description: "One click sends the post to TikTok, Instagram, Facebook, and YouTube Shorts.",
  },
];

export const BENEFITS: readonly Benefit[] = [
  {
    title: "Ship a week of content in an afternoon",
    description:
      "Move from one idea to a batch of finished, scheduled videos without booking a shoot or briefing an editor.",
  },
  {
    title: "Look professional without a studio",
    description:
      "Realistic avatars and product scenes give small teams the polish that used to require a production budget.",
  },
  {
    title: "Stay ahead of the trend",
    description:
      "The trend feed and AI scheduling keep you posting the right format at the right time, week after week.",
  },
];
