"use client";

import { Quote } from "lucide-react";
import Image from "next/image";
import { type ReactNode } from "react";

import { delay, useInView } from "@/lib/hooks/use-in-view";

/*
 * Problem and solution, from the owner's EcoVest design: badge and two-line
 * headline, one large card with the problem, and two solution cards with a few
 * words picked out and a hashtag. The problem is said in our own voice, not
 * put in a real person's mouth.
 */

function Soft({ children }: { children: ReactNode }): ReactNode {
  return <span className="text-[#636c76]">{children}</span>;
}

function Tag({ children }: { children: ReactNode }): ReactNode {
  return (
    <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[12px] font-medium text-[#3a3d42] shadow-[0_1px_2px_rgba(16,20,30,0.06)] ring-1 ring-black/[0.04] lg:px-4 lg:py-1.5 lg:text-[14px]">
      {children}
    </span>
  );
}

function SolutionCard({ text, tag, d }: { text: ReactNode; tag: string; d: number }): ReactNode {
  return (
    <div className="ev-rise flex min-h-[200px] flex-col rounded-[20px] bg-[#e9ecf2] p-5 lg:min-h-[340px] lg:rounded-[28px] lg:p-8" style={delay(d)}>
      <div>
        <Tag>Solution</Tag>
      </div>
      <p className="mt-8 max-w-[520px] text-[15px] leading-[1.5] text-[#1c1e22] lg:mt-auto lg:text-[20px] lg:leading-[1.45] xl:text-[22px]">{text}</p>
      <p className="mt-8 text-[14px] text-[#1c1e22] lg:mt-12 lg:text-[17px]">
        <span className="text-[#636c76]"># </span>
        {tag}
      </p>
    </div>
  );
}

export function EcoProblem(): ReactNode {
  const [ref, inView] = useInView<HTMLElement>();
  return (
    <section id="problem" ref={ref} data-in={inView} className="bg-paper px-4 py-16 md:px-8 md:py-28 xl:py-32">
      <div className="mx-auto max-w-[1040px] lg:max-w-[1180px] xl:max-w-[1280px]">
        <div className="ev-rise grid items-center gap-5 text-center md:grid-cols-[1fr_1.35fr] md:gap-10 md:text-left">
          <div>
            <span className="inline-flex items-center rounded-[61px] border border-[rgba(0,102,255,0.25)] bg-white px-3.5 py-1.5 text-[12px] font-medium uppercase tracking-[0.12em] text-[#555] lg:px-4 lg:py-2 lg:text-[14px]">
              Problem and solution
            </span>
          </div>
          <h2 className="text-[30px] font-normal leading-[1.1] tracking-[-0.03em] text-[#101010] md:text-[52px] lg:text-[64px] xl:text-[72px]">
            Simple answers
            <br />
            for{" "}
            <span aria-hidden="true" className="relative mx-[0.08em] inline-grid h-[0.78em] w-[0.78em] translate-y-[0.08em] place-items-center rounded-[28%] bg-[linear-gradient(180deg,#4d94ff,#0052cc)] align-baseline shadow-[0_4px_10px_-4px_rgba(0,82,204,0.45)]">
              <Image src="/brand/logo-mark-dark.png" alt="" width={48} height={48} className="h-[60%] w-[60%] object-contain brightness-0 invert" />
            </span>{" "}
            posting every day
          </h2>
        </div>

        <div className="ev-rise mt-10 rounded-[24px] bg-[#f3f4f7] p-3 md:mt-16 md:rounded-[30px] md:p-4 lg:mt-20 lg:rounded-[36px] lg:p-5" style={delay(150)}>
          <div className="px-2 pt-2 md:px-3 md:pt-3 lg:px-4 lg:pt-4">
            <Tag>Problem</Tag>
          </div>
          <figure className="mx-auto max-w-[560px] px-2 pb-12 pt-8 md:pb-24 md:pt-12 lg:max-w-[780px] lg:pb-32 lg:pt-16">
            <blockquote className="flex gap-3 lg:gap-4">
              <Quote className="mt-0.5 size-[22px] shrink-0 text-[#101010] lg:mt-1 lg:size-8" strokeWidth={1.8} aria-hidden />
              <p className="text-[17px] leading-[1.45] tracking-[-0.01em] text-[#101010] md:text-[22px] lg:text-[28px] lg:leading-[1.4] xl:text-[30px]">
                Small businesses know they should post short videos every day, but writing, filming, editing and posting one takes hours they do not have.
              </p>
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3 pl-[34px] lg:mt-8 lg:gap-4 lg:pl-12">
              <span className="grid size-10 place-items-center rounded-full bg-primary ring-2 ring-white lg:size-14">
                <Image src="/brand/logo-mark-dark.png" alt="" width={32} height={32} className="size-1/2 object-contain brightness-0 invert" />
              </span>
              <span>
                <span className="block text-[14px] font-medium text-[#101010] lg:text-[17px]">The Beyond Social team</span>
                <span className="block text-[13px] text-[#626b76] lg:text-[15px]">Why we built it</span>
              </span>
            </figcaption>
          </figure>
          <div className="grid gap-3 md:grid-cols-2 lg:gap-4">
            <SolutionCard
              d={350}
              tag="Speed"
              text={
                <>
                  Write <Soft>one sentence</Soft>. Our AI writes the script, picks the look and makes the video in <Soft>minutes</Soft>, not hours.
                </>
              }
            />
            <SolutionCard
              d={480}
              tag="Consistency"
              text={
                <>
                  Captions, the <Soft>best time to post</Soft> and posting to <Soft>TikTok and Instagram</Soft> happen for you, so you show up every day.
                </>
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
