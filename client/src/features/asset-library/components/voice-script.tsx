"use client";

import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";

/**
 * What to read so a recording captures a voice well: every common English
 * sound (th, v, z, sh, ch, j, r, l, ng), calm, excited and questioning tones,
 * and numbers, in about a minute of natural speech.
 */
export const VOICE_SCRIPT_PARTS: readonly { readonly tone: string; readonly text: string }[] = [
  { tone: "Relaxed, like meeting someone", text: "Hi, I'm [your name]. Thanks for stopping by. Today I want to show you something I really like, so let's get into it." },
  { tone: "Calm and clear, explaining", text: "First, the basics. This one is light, smooth and easy to use. You just pick it up, choose what you need, and you're done in a few minutes. I've used it every day this week, at home, at work and on the way back." },
  { tone: "Excited", text: "And this part surprised me! It's quick, it looks great, and the price was fair too." },
  { tone: "Asking, curious", text: "Have you tried something like this before? What would you use it for?" },
  { tone: "Details, steady pace", text: "It comes in three sizes, from twelve to forty-five, and it ships in about two to four days. Just check which one fits you." },
  { tone: "Warm closing", text: "If you want one, tap the link or send me a message. Thank you for watching, and I'll see you in the next video." },
];

const TIPS = [
  "A quiet room, with no music, fan or TV in the background.",
  "Hold your phone about a hand's length from your mouth.",
  "Talk the way you talk to a friend, not like you're reading.",
  "Read it all in one go. A small slip is fine, just keep going.",
  "Save it as MP3, M4A or WAV. It takes about a minute.",
];

/** The script and how to record it, shown when someone adds a voice. */
export function VoiceScript(): ReactNode {
  const [copied, setCopied] = useState(false);
  const all = VOICE_SCRIPT_PARTS.map((part) => part.text).join("\n\n");

  return (
    <section aria-labelledby="voice-script-heading" className="mt-4 rounded-xl border border-hairline bg-cloud/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 id="voice-script-heading" className="text-sm font-medium text-ink">
          Record yourself reading this
        </h3>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(all).then(
              () => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              },
              () => undefined,
            );
          }}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-ink-soft transition-colors hover:bg-cloud hover:text-ink"
        >
          {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <ol className="mt-3 flex flex-col gap-3">
        {VOICE_SCRIPT_PARTS.map((part) => (
          <li key={part.tone}>
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">{part.tone}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-ink">{part.text}</p>
          </li>
        ))}
      </ol>

      <ul className="mt-4 flex flex-col gap-1 border-t border-hairline pt-3 text-xs text-ink-soft">
        {TIPS.map((tip) => (
          <li key={tip} className="flex gap-2">
            <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-soft" />
            {tip}
          </li>
        ))}
      </ul>
    </section>
  );
}
