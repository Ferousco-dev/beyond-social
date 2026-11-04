import { CalendarClock, Clapperboard, Share2, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";

interface Highlight {
  readonly icon: LucideIcon;
  readonly label: string;
}

const HIGHLIGHTS: readonly Highlight[] = [
  { icon: Clapperboard, label: "AI Video Creation" },
  { icon: CalendarClock, label: "Smart Scheduling" },
  { icon: Share2, label: "Multi-Platform Publishing" },
];

export function AuthBrandingPanel(): ReactNode {
  return (
    <aside className="relative hidden overflow-hidden border-r border-border lg:block">
      <Image
        src="/images/auth-creator.jpg"
        alt="A content creator editing video at a desk in a calm, modern studio"
        fill
        sizes="(min-width: 1024px) 50vw, 0px"
        className="object-cover"
        priority
      />

      {/* Scrim: an even wash plus a stronger base keeps overlaid white text legible
          across both the bright wall and the darker desk. */}
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30" />

      <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white xl:p-16">
        <Logo />

        <div className="max-w-md">
          <h2 className="text-4xl font-semibold tracking-tight">Create. Publish. Grow.</h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-white/80">
            Create professional social media videos in minutes, optimize them with AI, and publish
            everywhere from one workspace.
          </p>

          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-sm font-medium text-white/90">
                <Icon className="size-4" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
