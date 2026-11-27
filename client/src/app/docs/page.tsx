import { type Metadata } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { PageShell } from "@/components/landing/page-shell";

export const metadata: Metadata = {
  title: "Documentation",
  description: "How Beyond Social works, step by step: making a video, your avatar, the editor, posting, credits and your account.",
};

interface Section {
  readonly id: string;
  readonly title: string;
  readonly steps: readonly ReactNode[];
}

const SECTIONS: readonly Section[] = [
  {
    id: "start",
    title: "Getting started",
    steps: [
      "Sign up with your email and a password. New accounts start with free credits.",
      "The short tour on your first visit shows where everything is. You can skip it, and replay it any time from the question mark at the top.",
      "Connect TikTok, Instagram or YouTube under Settings, Connections if you want us to post for you. You can make videos without connecting anything.",
    ],
  },
  {
    id: "make",
    title: "Making a video",
    steps: [
      "Open New Video and describe your idea in a sentence or two. Our AI fills in the rest: the purpose, who it is for, the length, the look and the script.",
      "Check what it chose. Change the length, the format (TikTok or Instagram 9:16, or a custom size), the look and the country. The script shows each scene with its timing.",
      "Changing the length rewrites the script to fit. Going back to a length you already tried shows that script again at once, for free, for 30 minutes.",
      "Add anything else in Extras, such as a discount code or who to aim at. When you press Generate video, our AI folds it in.",
      "The final review shows the price before anything is spent. Confirm, and the editor opens while your video is made.",
    ],
  },
  {
    id: "avatar",
    title: "Your avatar and voice",
    steps: [
      "Add a photo of your face under Assets, and record your voice reading the one-minute script we give you.",
      "Pick yourself as the person in the video, and your avatar speaks the script in your own voice.",
      "Only use your own face and voice, or someone's who has clearly agreed. You can delete them at any time.",
    ],
  },
  {
    id: "editor",
    title: "The editor",
    steps: [
      "The timeline has tracks for text, captions, video and audio. Drag clips to move them, drag their edges to trim, and split at the playhead.",
      "Chat lets you edit by asking: add a title, cut a clip, change its speed. Each AI change can be undone while it is the latest edit.",
      "Captions writes word-by-word captions from what is said. Pick a style, the colours, the size and the position.",
      "The editor saves as you go. If a generated clip turns out shorter than recorded, the editor trims it to its real length and closes the gap.",
    ],
  },
  {
    id: "post",
    title: "Posting and scheduling",
    steps: [
      "Press Export. Choose the accounts to post to, and our AI writes the caption for each. Edit it as you like.",
      "Our AI suggests the best time to post and fills in your time zone. Press Approve to schedule it, or post now.",
      "Change or cancel a scheduled post under Schedule until it goes out. Save to laptop downloads the video instead.",
    ],
  },
  {
    id: "discover",
    title: "Discover",
    steps: [
      "Search a topic to see short videos that are doing well on TikTok and Instagram right now.",
      "Open one to see how it opens and why it works, then make your own version from it.",
    ],
  },
  {
    id: "credits",
    title: "Credits and plans",
    steps: [
      "Every action our AI or our providers do uses credits. Settings, What things cost lists each price at your plan's rate.",
      "Credits are held when an action starts and kept when it finishes. If it fails, they go straight back, and you can see every charge and refund in your credit history.",
      "Free members pay with credits. Pro is a monthly plan with a session limit that refills five hours after you start and a weekly limit that refills every Monday; past them, extra usage uses credits up to a cap you set.",
    ],
  },
  {
    id: "account",
    title: "Your account and data",
    steps: [
      "Settings, Account changes your name and password, and deletes your account.",
      "Settings, Notifications turns on emails when your video is ready or could not be made.",
      <>
        What we keep, who helps us and how to have it erased are in the{" "}
        <Link href="/privacy" className="text-ink underline underline-offset-4 hover:text-primary">
          privacy policy
        </Link>
        . The rules for plans, credits and payments are in the{" "}
        <Link href="/terms" className="text-ink underline underline-offset-4 hover:text-primary">
          terms
        </Link>
        .
      </>,
    ],
  },
];

/** The product, step by step, written against what the app does today. */
export default function DocsPage(): ReactNode {
  return (
    <PageShell eyebrow="Resources" title="Documentation" lede="How Beyond Social works, from your first idea to a scheduled post.">
      <nav aria-label="On this page" className="mb-10 flex flex-wrap gap-2">
        {SECTIONS.map((section) => (
          <a key={section.id} href={`#${section.id}`} className="rounded-full border border-hairline px-3 py-1 text-sm text-ink-soft transition-colors hover:border-primary hover:text-ink">
            {section.title}
          </a>
        ))}
      </nav>
      <div className="flex flex-col gap-10">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24 border-t border-hairline pt-8 first:border-0 first:pt-0">
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">{section.title}</h2>
            <ol className="mt-4 flex flex-col gap-3">
              {section.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-base leading-relaxed text-ink-soft">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-cloud text-xs font-medium text-ink">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <p className="mt-12 text-base text-ink-soft">
        Stuck on something? The{" "}
        <Link href="/help" className="text-ink underline underline-offset-4 hover:text-primary">
          help centre
        </Link>{" "}
        answers the common questions, and hello@beyondsocial.app reaches a person.
      </p>
    </PageShell>
  );
}
