import { Zap } from "lucide-react";
import { type ReactNode } from "react";

/** One full-tile layer of background, so a look is drawn the way it actually reads: light, grain, framing. */
function Layer({ background, className = "" }: { background: string; className?: string }): ReactNode {
  return <span aria-hidden className={`absolute block ${className || "inset-0"}`} style={{ background }} />;
}

/** The name on the chip; `value` is what our AI is told. */
const SHORT: Readonly<Record<string, string>> = {
  "Bright and clean": "Bright",
  "Cinematic": "Cinematic",
  "Handheld, UGC feel": "Phone-shot",
  "Minimal studio": "Studio",
  "Warm and natural": "Warm",
  "Bold and high energy": "Bold",
};

export const STYLE_CARDS = [
  {
    value: "Bright and clean",
    hint: "Light and crisp. Good for products.",
    art: (
      <>
        <Layer background="linear-gradient(180deg, #f7faff, #d3e3fb)" />
        <Layer background="radial-gradient(circle at 70% 18%, rgba(255,255,255,0.95), rgba(255,255,255,0) 60%)" />
      </>
    ),
  },
  {
    value: "Cinematic",
    hint: "Moody film look with deep shadows.",
    art: (
      <>
        <Layer background="linear-gradient(180deg, #0f2f3a 0%, #181818 55%, #b8631f 100%)" />
        <Layer background="#000" className="inset-x-0 top-0 h-[20%]" />
        <Layer background="#000" className="inset-x-0 bottom-0 h-[20%]" />
      </>
    ),
  },
  {
    value: "Handheld, UGC feel",
    hint: "Shot on a phone. Real and personal.",
    art: (
      <>
        <Layer background="linear-gradient(135deg, #fde7a8, #f5a65b)" />
        <span aria-hidden className="absolute left-1/2 top-1/2 block h-6 w-[14px] -translate-x-1/2 -translate-y-1/2 -rotate-6 rounded-[4px] border-2 border-white/90 shadow-sm" />
      </>
    ),
  },
  {
    value: "Minimal studio",
    hint: "Plain backdrop, nothing distracting.",
    art: (
      <>
        <Layer background="linear-gradient(180deg, #f4f4f2, #dcdcd7)" />
        <Layer background="radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.18), rgba(0,0,0,0) 70%)" className="bottom-1.5 left-2.5 right-2.5 h-2.5" />
      </>
    ),
  },
  {
    value: "Warm and natural",
    hint: "Soft sunlight and golden tones.",
    art: (
      <>
        <Layer background="linear-gradient(180deg, #ffe9c9, #eeaa63)" />
        <Layer background="radial-gradient(circle at 78% 22%, rgba(255,248,224,0.95), rgba(255,236,190,0.4) 35%, rgba(255,220,160,0) 65%)" />
      </>
    ),
  },
  {
    value: "Bold and high energy",
    hint: "Vivid colours, fast and punchy.",
    art: (
      <>
        <Layer background="linear-gradient(135deg, #ff2d78 0%, #7a1dff 55%, #1a0b4d 100%)" />
        <Layer background="linear-gradient(115deg, rgba(255,214,10,0) 38%, rgba(255,214,10,0.95) 38%, rgba(255,214,10,0.95) 52%, rgba(255,214,10,0) 52%)" />
        <span aria-hidden className="absolute inset-0 flex items-center justify-center">
          <Zap className="size-4 fill-white text-white drop-shadow" />
        </span>
      </>
    ),
  },
].map((card) => ({ ...card, label: SHORT[card.value] ?? card.value }));
