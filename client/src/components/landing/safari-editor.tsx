import { ArrowLeft, ArrowUp, Captions, CircleHelp, Download, Film, Image as ImageIcon, Lightbulb, Lock, Music, Play, RotateCw, Send, SlidersHorizontal, Type, Upload } from "lucide-react";
import Image from "next/image";
import { type ReactNode } from "react";

/*
 * The real editor in a Safari window, playing a twelve-second loop: the cursor
 * asks the AI for a title, the title lands on the video and the timeline, then
 * it exports and approves the suggested posting time. Pure CSS (.se-* in
 * globals.css), so it costs no script, and people who turn motion off see the
 * finished state. Everything is sized in em with 1em = 1% of the window's
 * width, so on a phone it shrinks like a screenshot instead of reflowing.
 */

const STILL = "/brand/product-still.jpg";

function Thumb({ className = "" }: { className?: string }): ReactNode {
  return (
    <span className={`relative block shrink-0 overflow-hidden bg-black ${className}`}>
      <Image src={STILL} alt="" fill sizes="80px" className="object-cover" />
    </span>
  );
}

function Toolbar(): ReactNode {
  return (
    <div className="flex items-center gap-[1.2em] border-b border-[#e7e7ea] bg-[#f6f6f7] px-[1.6em] py-[0.9em]">
      <span className="flex gap-[0.6em]" aria-hidden="true">
        <span className="size-[1.2em] rounded-full bg-[#ff5f57]" />
        <span className="size-[1.2em] rounded-full bg-[#febc2e]" />
        <span className="size-[1.2em] rounded-full bg-[#28c840]" />
      </span>
      <div className="mx-auto flex w-[42em] items-center gap-[0.6em] rounded-[0.8em] bg-white px-[1.2em] py-[0.5em] text-[1.25em] text-[#6b6b70] ring-1 ring-[#e7e7ea]">
        <Lock className="size-[1em]" aria-hidden />
        <span className="mx-auto">beyondsocial.app/editor/serum-launch</span>
        <RotateCw className="size-[1em]" aria-hidden />
      </div>
      <span className="w-[5em]" aria-hidden="true" />
    </div>
  );
}

function TopBar(): ReactNode {
  return (
    <div className="flex items-center gap-[1em] border-b border-[#efeff1] px-[1.4em] py-[0.8em] text-[1.2em]">
      <ArrowLeft className="size-[1.2em] text-[#71717a]" aria-hidden />
      <span className="font-medium text-[#18181b]">Serum launch</span>
      <span className="text-[#a1a1aa]">Saved</span>
      <span className="ml-auto flex items-center gap-[0.9em]">
        <CircleHelp className="size-[1.2em] text-[#71717a]" aria-hidden />
        <span className="se-export flex items-center gap-[0.4em] rounded-[0.6em] bg-primary px-[0.9em] py-[0.4em] font-medium text-white">
          <Download className="size-[1em]" aria-hidden />
          Export
        </span>
      </span>
    </div>
  );
}

function Rail(): ReactNode {
  return (
    <div className="flex flex-col items-center gap-[1.6em] border-r border-[#efeff1] py-[1.4em] text-[#71717a]">
      <Film className="size-[1.7em] text-primary" aria-hidden />
      <Captions className="size-[1.7em]" aria-hidden />
      <Type className="size-[1.7em]" aria-hidden />
      <ImageIcon className="size-[1.7em]" aria-hidden />
      <Music className="size-[1.7em]" aria-hidden />
    </div>
  );
}

function MediaPanel(): ReactNode {
  return (
    <div className="border-r border-[#efeff1] p-[1.2em] text-[1.15em]">
      <p className="font-medium text-[#18181b]">Media</p>
      <span className="mt-[0.8em] flex items-center justify-center gap-[0.4em] rounded-[0.6em] border border-[#e4e4e7] py-[0.45em] text-[#3f3f46]">
        <Upload className="size-[1em]" aria-hidden />
        Upload video
      </span>
      <div className="mt-[0.8em] space-y-[0.5em]">
        {[
          ["Serum close-up", "5.0s"],
          ["Pour and drip", "4.0s"],
          ["Shelf shot", "7.0s"],
        ].map(([name, length]) => (
          <div key={name} className="flex items-center gap-[0.6em] rounded-[0.6em] bg-[#f6f6f7] p-[0.4em]">
            <Thumb className="h-[2.6em] w-[1.6em] rounded-[0.3em]" />
            <span className="min-w-0 flex-1 truncate text-[#3f3f46]">{name}</span>
            <span className="font-mono text-[0.85em] text-[#a1a1aa]">{length}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Preview(): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center gap-[0.8em] bg-[#fafafa] py-[1.2em]">
      <div className="relative aspect-[9/16] h-[25em] overflow-hidden rounded-[0.8em] bg-black shadow-[0_1em_3em_-1em_rgba(0,0,0,0.45)]">
        <Image src={STILL} alt="" fill sizes="(min-width: 1024px) 160px, 30vw" className="se-kenburns object-cover" />
        <span className="se-title absolute inset-x-[1em] top-[2.4em] text-center text-[1.5em] font-extrabold leading-tight text-white [text-shadow:0_0.1em_0.4em_rgba(0,0,0,0.6)]">
          Glow in 7 days
        </span>
        <span className="absolute inset-x-[1.2em] bottom-[3em] rounded-[0.4em] bg-black/55 px-[0.5em] py-[0.35em] text-center text-[1.1em] font-bold text-white">
          Your skin <span className="text-[#ffd400]">will</span> thank you
        </span>
      </div>
      <span className="flex items-center gap-[0.5em] font-mono text-[1.1em] text-[#71717a]">
        <Play className="size-[1em]" aria-hidden />
        00:04.2 / 00:16.0
      </span>
    </div>
  );
}

function ChatPanel(): ReactNode {
  return (
    <div className="flex flex-col border-l border-[#efeff1] text-[1.15em]">
      <div className="flex gap-[0.4em] border-b border-[#efeff1] p-[0.6em]">
        <span className="flex items-center gap-[0.4em] rounded-[0.5em] bg-[#f4f4f5] px-[0.7em] py-[0.3em] font-medium text-[#18181b]">
          <Lightbulb className="size-[1em] text-primary" aria-hidden />
          Chat
        </span>
        <span className="flex items-center gap-[0.4em] px-[0.7em] py-[0.3em] text-[#71717a]">
          <SlidersHorizontal className="size-[1em]" aria-hidden />
          Editor
        </span>
      </div>
      <div className="relative flex-1 p-[0.9em]">
        <div className="se-chips flex flex-col items-center gap-[0.5em] pt-[1.6em] text-center">
          <Lightbulb className="size-[2em] text-primary" aria-hidden />
          <p className="font-medium text-[#18181b]">Edit by asking</p>
          <span className="se-chip rounded-full border border-[#e4e4e7] px-[0.8em] py-[0.3em] text-[0.9em] text-[#52525b]">Add a title at the start</span>
          <span className="rounded-full border border-[#e4e4e7] px-[0.8em] py-[0.3em] text-[0.9em] text-[#52525b]">Speed up the clip to 1.5x</span>
        </div>
        <div className="absolute inset-x-[0.9em] top-[0.9em] space-y-[0.6em]">
          <p className="se-ask ml-auto w-fit rounded-[1em] bg-primary px-[0.8em] py-[0.45em] text-white">Add a title at the start</p>
          <p className="se-working w-fit text-[#a1a1aa]">Working…</p>
          <p className="se-reply w-fit rounded-[1em] bg-[#f4f4f5] px-[0.8em] py-[0.45em] text-[#3f3f46]">Done. “Glow in 7 days” shows for the first 2 seconds.</p>
        </div>
      </div>
      <div className="m-[0.7em] flex items-center rounded-[0.7em] border border-[#e4e4e7] px-[0.7em] py-[0.5em] text-[#a1a1aa]">
        Ask for an edit
        <span className="ml-auto grid size-[1.7em] place-items-center rounded-[0.45em] bg-primary text-white">
          <ArrowUp className="size-[1em]" aria-hidden />
        </span>
      </div>
    </div>
  );
}

function Timeline(): ReactNode {
  const ticks = ["00:00", "00:04", "00:08", "00:12", "00:16"];
  return (
    <div className="relative col-span-full border-t border-[#efeff1] px-[1.2em] pb-[1em] pt-[0.6em] text-[1em]">
      <div className="ml-[6em] flex justify-between font-mono text-[0.95em] text-[#a1a1aa]">
        {ticks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
      <div className="mt-[0.4em] space-y-[0.4em]">
        <div className="flex items-center">
          <span className="w-[6em] text-[1.1em] text-[#71717a]">Text</span>
          <div className="relative h-[2em] flex-1">
            <span className="se-textclip absolute left-0 top-0 flex h-full w-[13%] items-center rounded-[0.4em] bg-[#7c3aed] px-[0.5em] text-[0.95em] font-medium text-white">Glow in 7 days</span>
          </div>
        </div>
        <div className="flex items-center">
          <span className="w-[6em] text-[1.1em] text-[#71717a]">Captions</span>
          <div className="flex h-[2em] flex-1 gap-[0.2em]">
            {[18, 22, 16, 24, 14].map((width, i) => (
              <span key={i} className="h-full rounded-[0.4em] bg-[#fde68a]" style={{ width: `${width}%` }} />
            ))}
          </div>
        </div>
        <div className="flex items-center">
          <span className="w-[6em] text-[1.1em] text-[#71717a]">Video</span>
          <div className="flex h-[3.6em] flex-1 gap-[0.3em]">
            {[
              ["Scene 1 · Hook", 31],
              ["Scene 2 · Product", 44],
              ["Scene 3 · Offer", 25],
            ].map(([label, width]) => (
              <span key={label} className="relative flex overflow-hidden rounded-[0.5em] ring-2 ring-[#2563eb]/70" style={{ width: `${width}%` }}>
                {Array.from({ length: 6 }, (_, i) => (
                  <Thumb key={i} className="h-full flex-1" />
                ))}
                <span className="absolute left-[0.4em] top-[0.3em] rounded-[0.3em] bg-black/60 px-[0.4em] text-[0.9em] font-medium text-white">{label}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center">
          <span className="w-[6em] text-[1.1em] text-[#71717a]">Audio</span>
          <div className="h-[1.6em] flex-1 rounded-[0.4em] bg-[#dcfce7] [background-image:repeating-linear-gradient(90deg,#86efac_0_0.15em,transparent_0.15em_0.5em)]" />
        </div>
      </div>
      <span className="se-playhead pointer-events-none absolute bottom-[0.6em] top-[1.6em] w-[0.15em] bg-primary" style={{ left: "calc(1.2em + 6em)" }} />
    </div>
  );
}

function PostPanel(): ReactNode {
  return (
    <div className="se-post absolute right-[2em] top-[4.6em] w-[30em] rounded-[1.2em] border border-[#e4e4e7] bg-white p-[1.2em] text-[1.15em] shadow-[0_1.5em_4em_-1em_rgba(0,0,0,0.3)]">
      <p className="font-semibold text-[#18181b]">Post your video</p>
      <div className="mt-[0.8em] flex items-center gap-[0.6em] rounded-[0.7em] border border-primary bg-[#eef4ff] px-[0.8em] py-[0.5em]">
        <span className="grid size-[1.6em] place-items-center rounded-full bg-black text-[0.8em] font-bold text-white">T</span>
        <span className="text-[#18181b]">TikTok · @glowlab</span>
      </div>
      <p className="mt-[0.7em] text-[#52525b]">Glow in 7 days. Two drops every morning and your skin does the rest. #skincare</p>
      <div className="mt-[0.8em] flex items-center gap-[0.5em] rounded-[0.7em] bg-[#f4f4f5] px-[0.8em] py-[0.5em]">
        <Lightbulb className="size-[1.1em] text-primary" aria-hidden />
        <span className="se-best text-[#18181b]">
          Best time: <b className="font-semibold">Tomorrow 7 pm</b>
        </span>
        <span className="se-approve ml-auto rounded-[0.5em] bg-primary px-[0.7em] py-[0.2em] text-white">Approve</span>
      </div>
      <div className="mt-[0.8em] flex justify-end">
        <span className="flex items-center gap-[0.4em] rounded-[0.6em] bg-primary px-[0.9em] py-[0.4em] font-medium text-white">
          <Send className="size-[1em]" aria-hidden />
          <span className="se-schedule">Schedule for TikTok</span>
        </span>
      </div>
    </div>
  );
}

/** A macOS arrow pointer. */
function Cursor(): ReactNode {
  return (
    <svg className="se-cursor pointer-events-none absolute left-0 top-0 z-20 h-[2.4em] w-[2.4em] drop-shadow-[0_0.2em_0.3em_rgba(0,0,0,0.35)]" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 2.5v17.2l4.3-4.1 2.8 6.4 3-1.3-2.8-6.3h6z" fill="#111" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function SafariEditor(): ReactNode {
  return (
    <div className="relative z-10 mx-auto mt-12 w-full max-w-[1100px] px-4 md:mt-auto md:pt-16">
      <div className="[container-type:inline-size]">
        <div
          className="relative overflow-hidden rounded-t-[1.4em] border border-b-0 border-[#e4e4e7] bg-white text-[1cqw] shadow-[0_3em_8em_-3em_rgba(0,71,179,0.45)]"
          role="img"
          aria-label="The Beyond Social editor: the AI adds a title to a serum video when asked, then the video is scheduled for the best time on TikTok"
        >
          <Toolbar />
          <TopBar />
          <div className="grid grid-cols-[5em_19em_1fr_27em]">
            <Rail />
            <MediaPanel />
            <Preview />
            <ChatPanel />
            <Timeline />
          </div>
          <PostPanel />
          <Cursor />
        </div>
      </div>
    </div>
  );
}
