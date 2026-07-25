import { Play } from "lucide-react";
import Image from "next/image";
import { type ReactNode } from "react";

import { SHOWCASE } from "@/lib/marketing/landing";

import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

/**
 * Format showcase. Vertical cards mirror the 9:16 frame the product actually
 * outputs, so the section demonstrates the format rather than describing it.
 */
export function Showcase(): ReactNode {
  return (
    <section id="showcase" className="scroll-mt-20 border-t border-hairline py-24 sm:py-32">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
        <SectionHeading
          eyebrow="Built for the feed"
          title="Native vertical, never cropped"
          description="Every clip is composed for the frame it will be watched in, with captions placed clear of the platform interface."
        />

        <div className="mt-14 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {SHOWCASE.map((item, index) => (
            <Reveal key={item.title} delay={index * 70}>
              <figure className="group relative overflow-hidden rounded-2xl border border-hairline bg-paper">
                <Image
                  src={item.image}
                  alt={item.alt}
                  width={600}
                  height={900}
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 260px"
                  className="aspect-[9/16] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent"
                />
                <span
                  aria-hidden
                  className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none"
                >
                  <Play className="size-3.5 fill-current" />
                </span>
                <figcaption className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                  <p className="truncate text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-0.5 truncate text-[11px] text-white/70">{item.meta}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
