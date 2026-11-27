"use client";

import { ArrowUp, CalendarCheck, Check, Lightbulb, Mic, Play } from "lucide-react";
import Image from "next/image";
import { type ReactNode } from "react";

import { delay, useInView } from "@/lib/hooks/use-in-view";

/*
 * Features as a bento grid, from the owner's Hush site: cards of different
 * sizes, each with a drawing of the real app at that step, a title and one
 * line. Drawings are sized in em with 1em = 1% of the drawing's width, so they
 * scale as pictures on a phone instead of reflowing.
 */

const STILL = "/brand/product-still.jpg";
const AVATAR = "/brand/avatar-silhouette.jpg";

/** A white app panel at a fixed shape, scaled to the card. */
function Art({ children, ratio = "44 / 30", label }: { children: ReactNode; ratio?: string; label: string }): ReactNode {
  return (
    <div className="[container-type:inline-size]">
      <div role="img" aria-label={label} className="relative w-full overflow-hidden rounded-[18px] bg-white text-[1cqw] text-[#3f3f46] ring-1 ring-black/[0.05]" style={{ aspectRatio: ratio }}>
        {children}
      </div>
    </div>
  );
}

function Card({ title, text, art, className = "", d }: { title: string; text: string; art: ReactNode; className?: string; d: number }): ReactNode {
  return (
    <li className={`ev-rise flex flex-col overflow-hidden rounded-[24px] bg-[#f1f3f6] lg:rounded-[28px] ${className}`} style={delay(d)}>
      <div className="p-2 lg:p-3">{art}</div>
      <div className="mt-auto px-5 pb-6 pt-2 lg:px-7 lg:pb-8">
        <h3 className="text-[19px] font-medium leading-[1.25] tracking-[-0.015em] text-[#101010] lg:text-[21px]">{title}</h3>
        <p className="mt-2 max-w-[460px] text-[15px] leading-[1.5] text-[#4b5058] [text-wrap:pretty] lg:text-[16px]">{text}</p>
      </div>
    </li>
  );
}

/* ---------------------------------------------------------------- idea to script */

function ScriptArt(): ReactNode {
  const scenes = [
    ["0–3s", "Hook", "Dry skin by noon? Not anymore."],
    ["3–9s", "Product", "Two drops of our vitamin C serum every morning."],
    ["9–15s", "Offer", "Glow in 7 days. 20% off this week."],
  ];
  return (
    <Art ratio="88 / 30" label="A one-sentence idea written into a three-scene script with timings">
      <div className="absolute inset-[4em] flex gap-[4em]">
        <div className="w-[34em]">
          <p className="text-[1.8em] font-medium text-[#18181b]">Your idea</p>
          <div className="mt-[1.2em] rounded-[1.2em] border border-[#e4e4e7] p-[1.6em] text-[1.9em] leading-snug text-[#18181b]">
            A 15-second promo for our new vitamin C serum
            <span className="ev-caret ml-[0.1em] inline-block h-[1em] w-[0.08em] translate-y-[0.15em] bg-primary" />
          </div>
          <div className="mt-[1.4em] flex flex-wrap gap-[0.8em] text-[1.5em]">
            {["15s", "TikTok 9:16", "Warm", "Nigeria"].map((chip, i) => (
              <span key={chip} className={`rounded-full border px-[0.8em] py-[0.25em] ${i === 0 ? "border-primary bg-[#eef4ff] text-[#18181b]" : "border-[#e4e4e7]"}`}>
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <p className="flex items-center gap-[0.5em] text-[1.8em] font-medium text-[#18181b]">
            <Lightbulb className="size-[1em] text-primary" aria-hidden />
            Script
          </p>
          <ol className="mt-[1.2em] space-y-[1em]">
            {scenes.map(([time, name, line], i) => (
              <li key={name} className="ev-rise flex gap-[1.2em] rounded-[1em] bg-[#f6f7f9] p-[1.2em]" style={delay(300 + i * 160)}>
                <span className="w-[5em] shrink-0 font-mono text-[1.4em] text-primary">{time}</span>
                <span className="text-[1.6em]">
                  <b className="font-medium text-[#18181b]">{name}.</b> {line}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Art>
  );
}

/* ---------------------------------------------------------------- look */

function LookArt(): ReactNode {
  const looks = [
    ["Bright", "from-[#fde68a] to-[#fca5a5]"],
    ["Cinematic", "from-[#0f172a] to-[#334155]"],
    ["Pastel", "from-[#fbcfe8] to-[#c7d2fe]"],
    ["Studio", "from-[#e5e7eb] to-[#9ca3af]"],
    ["Warm", "from-[#fdba74] to-[#b45309]"],
    ["Bold", "from-[#7c3aed] to-[#db2777]"],
  ];
  return (
    <Art label="Six looks to choose from, with Warm picked">
      <p className="absolute left-[6em] top-[5em] text-[3.4em] font-medium text-[#18181b]">Look</p>
      <div className="absolute inset-x-[8em] top-[15em] grid grid-cols-3 gap-x-[3em] gap-y-[2.4em]">
        {looks.map(([name, tone]) => (
          <div key={name} className="flex flex-col items-center gap-[1.2em]">
            <span className={`relative aspect-square w-[62%] rounded-full bg-gradient-to-br ${tone} ${name === "Warm" ? "ring-[0.6em] ring-primary ring-offset-[0.6em]" : ""}`}>
              {name === "Warm" ? (
                <span className="absolute -right-[0.4em] -top-[0.4em] grid size-[5em] place-items-center rounded-full bg-primary text-white">
                  <Check className="size-[3em]" aria-hidden />
                </span>
              ) : null}
            </span>
            <span className="text-[2.6em] text-[#52525b]">{name}</span>
          </div>
        ))}
      </div>
    </Art>
  );
}

/* ---------------------------------------------------------------- avatar and voice */

function AvatarArt(): ReactNode {
  const bars = [30, 52, 40, 70, 46, 82, 58, 36, 64, 44, 76, 50, 34, 60];
  return (
    <Art label="Your avatar with a recorded voice ready to speak the script">
      <div className="absolute inset-[5em] flex items-center gap-[5em]">
        <span className="relative aspect-[9/16] h-full shrink-0 overflow-hidden rounded-[3em]">
          <Image src={AVATAR} alt="" fill sizes="160px" className="object-cover" />
        </span>
        <div className="flex-1">
          <p className="text-[3.2em] font-medium text-[#18181b]">You</p>
          <p className="text-[2.6em] text-[#71717a]">Face and voice saved</p>
          <div className="mt-[4em] flex h-[14em] items-center gap-[1.2em]">
            {bars.map((height, i) => (
              <span key={i} className="ev-wave w-[1.6em] rounded-full bg-primary" style={{ height: `${height}%`, animationDelay: `${i * 90}ms` }} />
            ))}
          </div>
          <span className="mt-[4em] inline-flex items-center gap-[1em] rounded-full bg-[#eef4ff] px-[2.4em] py-[1em] text-[2.6em] text-[#0052cc]">
            <Mic className="size-[1em]" aria-hidden />
            One-minute recording
          </span>
        </div>
      </div>
    </Art>
  );
}

/* ---------------------------------------------------------------- captions */

/** The five caption styles as the real Captions panel shows them: the same words, styled. */
const CAPTION_STYLES = [
  { name: "Karaoke", word: "text-[#eab308]", tile: "" },
  { name: "Pill", word: "rounded-[0.25em] bg-[#facc15] px-[0.15em]", tile: "" },
  { name: "Classic", word: "", tile: "" },
  { name: "Box", word: "", tile: "rounded-[0.2em] bg-[#18181b] px-[0.3em] text-white" },
  { name: "Minimal", word: "", tile: "font-medium" },
];

const SPOKEN = ["Glow", "in", "7", "days"];

function CaptionsArt(): ReactNode {
  return (
    <Art label="A video whose caption lights up word by word, beside the captions panel with Karaoke picked">
      <div className="absolute inset-[5em] flex gap-[5em]">
        <span className="relative aspect-[9/16] h-full shrink-0 overflow-hidden rounded-[3em] bg-black shadow-[0_2em_4em_-2em_rgba(0,0,0,0.5)]">
          <Image src={STILL} alt="" fill sizes="160px" className="object-cover" />
          <span className="absolute inset-x-0 bottom-[2.4em] flex justify-center gap-[0.3em] px-[1em] text-[3.4em] font-extrabold text-white [text-shadow:0_0.08em_0.3em_rgba(0,0,0,0.7)]">
            {SPOKEN.map((word, i) => (
              <span key={word} className="kw-word" style={{ animationDelay: `${i * 0.6}s` }}>
                {word}
              </span>
            ))}
          </span>
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[2.6em]">
          <span className="grid h-[8em] place-items-center rounded-[1.6em] bg-primary font-medium text-white">
            <span className="text-[3em]">Generate captions</span>
          </span>
          <div>
            <p className="text-[2.8em] text-[#71717a]">Style</p>
            <div className="mt-[1.4em] grid grid-cols-3 gap-[1.4em]">
              {CAPTION_STYLES.map((style) => (
                <span
                  key={style.name}
                  className={`flex h-[9.5em] flex-col items-center justify-center rounded-[1.4em] border bg-[#fafafa] ${style.name === "Karaoke" ? "border-primary ring-[0.3em] ring-primary/15" : "border-[#e4e4e7]"}`}
                >
                  <span className={`whitespace-nowrap text-[2.5em] font-extrabold leading-tight text-[#18181b] ${style.tile}`}>
                    Hi <span className={style.word}>you</span>
                  </span>
                  <span className="text-[2.2em] text-[#71717a]">{style.name}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[2.8em] text-[#71717a]">Size</span>
            <span className="flex rounded-[1.4em] border border-[#e4e4e7] p-[0.6em]">
              {["S", "M", "L"].map((size) => (
                <span key={size} className={`rounded-[0.4em] px-[0.8em] py-[0.15em] text-[2.6em] ${size === "M" ? "bg-[#eef4ff] font-medium text-primary" : "text-[#71717a]"}`}>
                  {size}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
    </Art>
  );
}

/* ---------------------------------------------------------------- edit by asking */

function ChatArt(): ReactNode {
  return (
    <Art label="Asking the editor to cut the clip at the playhead: the clip splits in two and the AI confirms">
      <div className="absolute inset-[5em] flex flex-col">
        <div className="relative flex h-[11em] gap-[0.6em] rounded-[1.4em] bg-[#f4f4f5] p-[1em]">
          <span className="relative flex h-full flex-[3] overflow-hidden rounded-[0.9em] ring-[0.35em] ring-primary/70">
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i} className="relative h-full flex-1">
                <Image src={STILL} alt="" fill sizes="60px" className="object-cover" />
              </span>
            ))}
          </span>
          <span className="ch-cut h-full rounded-full bg-white" />
          <span className="relative flex h-full flex-[2] overflow-hidden rounded-[0.9em] ring-[0.35em] ring-primary/70">
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className="relative h-full flex-1">
                <Image src={STILL} alt="" fill sizes="60px" className="object-cover" />
              </span>
            ))}
          </span>
          <span className="absolute -bottom-[1em] -top-[1em] left-[60%] w-[0.5em] rounded-full bg-primary" />
        </div>
        <div className="mt-[3.5em] flex flex-col gap-[1.6em]">
          <p className="ch-ask ml-auto w-fit rounded-[1em] bg-primary px-[1em] py-[0.55em] text-[3em] text-white">
            <span className="text-[1em]">Cut the clip at the playhead</span>
          </p>
          <div className="relative h-[8em]">
            <p className="ch-working absolute left-0 top-0 text-[3em] text-[#a1a1aa]">Working…</p>
            <div className="ch-reply absolute left-0 top-0">
              <p className="w-fit rounded-[1em] bg-[#f4f4f5] px-[1em] py-[0.55em] text-[3em] text-[#27272a]">Done. Scene 2 is now two clips.</p>
              <p className="mt-[0.6em] pl-[0.4em] text-[2.6em] text-[#71717a]">↩ Undo this change</p>
            </div>
          </div>
        </div>
        <div className="relative mt-auto h-[13em] rounded-[1.6em] border border-[#e4e4e7] bg-white">
          <span className="absolute left-[1em] top-[0.8em] text-[3em] text-[#a1a1aa]">Ask for an edit</span>
          <span className="absolute bottom-[1.6em] right-[1.6em] grid size-[6em] place-items-center rounded-[1.4em] bg-primary text-white">
            <ArrowUp className="size-[3.2em]" aria-hidden />
          </span>
        </div>
      </div>
    </Art>
  );
}

/* ---------------------------------------------------------------- post at the best time */

function PostArt(): ReactNode {
  const week = [
    ["Mon", "7 pm", true],
    ["Tue", "12 pm", true],
    ["Wed", "7 pm", true],
    ["Thu", "6 pm", false],
    ["Fri", "8 pm", false],
  ] as const;
  return (
    <Art ratio="60 / 34" label="The best time to post suggested and approved, and a week of scheduled posts">
      <div className="absolute inset-[4em] flex flex-col gap-[3em]">
        <div className="flex items-center gap-[1.6em] rounded-[1.6em] bg-[#f4f4f5] px-[2em] py-[1.6em] text-[2.2em]">
          <Lightbulb className="size-[1.1em] text-primary" aria-hidden />
          <span className="text-[#18181b]">
            Best time: <b className="font-semibold">Tomorrow 7 pm</b>
          </span>
          <span className="ml-auto flex items-center gap-[0.4em] rounded-[0.6em] bg-[#16a34a] px-[0.8em] py-[0.25em] text-white">
            <Check className="size-[1em]" aria-hidden />
            Approved
          </span>
        </div>
        <div className="grid flex-1 grid-cols-5 gap-[1.6em]">
          {week.map(([day, time, posted]) => (
            <div key={day} className="flex flex-col rounded-[1.6em] border border-[#e4e4e7] p-[1.4em]">
              <span className="text-[2em] font-medium text-[#18181b]">{day}</span>
              <span className="relative mt-[1em] flex-1 overflow-hidden rounded-[1em] bg-black">
                <Image src={STILL} alt="" fill sizes="120px" className="object-cover" />
                <Play className="absolute left-1/2 top-1/2 size-[3em] -translate-x-1/2 -translate-y-1/2 text-white" aria-hidden />
              </span>
              <span className={`mt-[1em] flex items-center gap-[0.4em] text-[1.7em] ${posted ? "text-[#16a34a]" : "text-[#71717a]"}`}>
                {posted ? <Check className="size-[1em]" aria-hidden /> : <CalendarCheck className="size-[1em]" aria-hidden />}
                {posted ? "Posted" : time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Art>
  );
}

export function EcoFeatures(): ReactNode {
  const [ref, inView] = useInView<HTMLElement>();
  return (
    <section id="features" ref={ref} data-in={inView} className="scroll-mt-20 px-4 py-16 md:px-8 md:py-28 xl:py-32">
      <div className="mx-auto max-w-[1040px] lg:max-w-[1180px] xl:max-w-[1280px]">
        <div className="ev-rise grid gap-5 text-center md:grid-cols-[1.4fr_1fr] md:items-end md:gap-10 md:text-left">
          <div>
            <span className="inline-flex items-center rounded-full border border-[rgba(0,102,255,0.25)] bg-white px-3.5 py-1.5 text-[12px] font-medium uppercase tracking-[0.12em] text-[#555] lg:px-4 lg:py-2 lg:text-[14px]">
              Features
            </span>
            <h2 className="mt-5 font-serif text-[40px] font-normal not-italic leading-[1.04] tracking-[-0.02em] text-[#101010] md:mt-6 md:text-[60px] lg:text-[72px] xl:text-[80px]">
              One idea in,
              <br />a week of posts out
            </h2>
          </div>
          <p className="mx-auto max-w-[400px] text-[16px] leading-[1.5] text-[#4b5058] md:mx-0 md:pb-3 md:text-[18px]">
            Everything between your idea and a posted video happens in one place, and our AI does most of it.
          </p>
        </div>

        <ul className="mt-10 grid gap-4 md:mt-16 md:grid-cols-3 lg:mt-20 lg:gap-5">
          <Card className="md:col-span-2" d={150} art={<ScriptArt />} title="From one sentence to a full script" text="Say what the video is for. Our AI writes the hook, the scenes and the words, timed to the length you pick." />
          <Card d={230} art={<LookArt />} title="Pick a look" text="Bright, cinematic, pastel or warm. One tap sets the colours, light and pace." />
          <Card d={150} art={<AvatarArt />} title="Your face, your voice" text="Record one minute once. Your avatar speaks every script in your own voice." />
          <Card d={230} art={<CaptionsArt />} title="Captions that pop" text="Word-by-word captions in five styles, written from what is actually said." />
          <Card d={310} art={<ChatArt />} title="Edit by asking" text="Tell the editor what to change. It cuts, trims, adds titles and changes speed." />
          <li className="ev-rise overflow-hidden rounded-[24px] bg-[#f1f3f6] md:col-span-3 lg:rounded-[28px]" style={delay(150)}>
            <div className="grid items-center md:grid-cols-[1fr_1.35fr]">
              <div className="order-2 px-5 pb-6 pt-2 md:order-1 md:px-10 md:py-10 lg:px-14">
                <span className="mb-4 grid size-10 place-items-center rounded-full bg-primary lg:mb-5 lg:size-12">
                  <Image src="/brand/logo-mark-dark.png" alt="" width={28} height={28} className="size-1/2 object-contain brightness-0 invert" />
                </span>
                <h3 className="text-[19px] font-medium leading-[1.25] tracking-[-0.015em] text-[#101010] lg:text-[26px]">Posts at the best time</h3>
                <p className="mt-2 max-w-[420px] text-[15px] leading-[1.5] text-[#4b5058] [text-wrap:pretty] lg:mt-3 lg:text-[17px]">
                  Our AI suggests when your audience is watching. Approve it once and your posts go out to TikTok and Instagram on their own, all week.
                </p>
              </div>
              <div className="order-1 p-2 md:order-2 lg:p-3">
                <PostArt />
              </div>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}
