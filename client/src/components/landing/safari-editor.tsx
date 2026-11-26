import { Captions, Film, Image as ImageIcon, Lightbulb, Lock, Music, Play, RotateCw, Type } from "lucide-react";
import { type ReactNode } from "react";

/*
 * The editor in a Safari window, rising from the bottom of the hero where
 * EcoVest had its phones. It is drawn, not a screenshot, so it stays sharp at
 * any size and shows no real person.
 */

const CLIPS = [
  { label: "Scene 1 · Hook", width: "w-[30%]", tone: "from-[#0047b3] to-[#4d94ff]" },
  { label: "Scene 2 · Product", width: "w-[38%]", tone: "from-[#1d4ed8] to-[#60a5fa]" },
  { label: "Scene 3 · Call to action", width: "w-[26%]", tone: "from-[#0b3d91] to-[#3b82f6]" },
];

function Toolbar(): ReactNode {
  return (
    <div className="flex items-center gap-3 border-b border-[#e7e7ea] bg-[#f6f6f7] px-4 py-2.5">
      <span className="flex gap-1.5" aria-hidden="true">
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
      </span>
      <div className="mx-auto flex w-full max-w-[420px] items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-1 text-[12px] text-[#6b6b70] ring-1 ring-[#e7e7ea]">
        <Lock className="size-3" aria-hidden />
        beyondsocial.app/editor
        <RotateCw className="ml-auto size-3" aria-hidden />
      </div>
      <span className="w-[54px]" aria-hidden="true" />
    </div>
  );
}

function Editor(): ReactNode {
  return (
    <div className="grid grid-cols-[44px_1fr] bg-white text-[11px] text-[#3f3f46] md:grid-cols-[44px_170px_1fr_210px]">
      <div className="flex flex-col items-center gap-3 border-r border-[#efeff1] py-3 text-[#71717a]">
        <Film className="size-4 text-primary" aria-hidden />
        <Captions className="size-4" aria-hidden />
        <Type className="size-4" aria-hidden />
        <ImageIcon className="size-4" aria-hidden />
        <Music className="size-4" aria-hidden />
      </div>
      <div className="hidden border-r border-[#efeff1] p-3 md:block">
        <p className="font-medium text-[#18181b]">Media</p>
        <div className="mt-2 space-y-1.5">
          {["Avatar video · 8.0s", "Product shot · 5.0s", "Voiceover · 12s"].map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-md bg-[#f6f6f7] px-2 py-1.5">
              <span className="h-5 w-3.5 rounded-sm bg-gradient-to-b from-[#0047b3] to-[#9cc7ff]" />
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center justify-center gap-2 bg-[#fafafa] p-4">
        <div className="relative aspect-[9/16] h-[180px] overflow-hidden rounded-lg bg-gradient-to-b from-[#0b1b3a] via-[#0047b3] to-[#4d94ff] shadow-lg md:h-[230px]">
          <span className="absolute inset-x-3 bottom-8 rounded bg-black/55 px-1.5 py-1 text-center text-[10px] font-bold text-white">
            Watch <span className="text-[#ffd400]">this</span> part
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-[#71717a]">
          <Play className="size-3" aria-hidden />
          00:04.2 / 00:16.0
        </span>
      </div>
      <div className="hidden border-l border-[#efeff1] p-3 md:block">
        <p className="flex items-center gap-1.5 font-medium text-[#18181b]">
          <Lightbulb className="size-3.5 text-primary" aria-hidden />
          Chat
        </p>
        <p className="ml-auto mt-3 w-fit rounded-xl bg-primary px-2.5 py-1.5 text-white">Add a title at the start</p>
        <p className="mt-2 w-fit rounded-xl bg-[#f4f4f5] px-2.5 py-1.5">Done. I added “Fresh every morning” for the first 2 seconds.</p>
      </div>
      <div className="col-span-full border-t border-[#efeff1] p-3">
        <div className="flex gap-1.5">
          {CLIPS.map((clip) => (
            <div key={clip.label} className={`${clip.width} truncate rounded-md bg-gradient-to-r ${clip.tone} px-2 py-2 text-[10px] font-medium text-white`}>
              {clip.label}
            </div>
          ))}
        </div>
        <div className="mt-1.5 h-4 w-[64%] rounded-md bg-[#e8f0ff]" />
      </div>
    </div>
  );
}

export function SafariEditor(): ReactNode {
  return (
    <div className="relative z-10 mx-auto mt-12 w-full max-w-[1040px] px-4 md:mt-16">
      <div className="overflow-hidden rounded-t-[14px] border border-b-0 border-[#e4e4e7] bg-white shadow-[0_30px_80px_-30px_rgba(0,71,179,0.45)]" role="img" aria-label="The Beyond Social editor in a Safari window: media, a video preview with captions, an AI chat, and a timeline of scenes">
        <Toolbar />
        <Editor />
      </div>
    </div>
  );
}
