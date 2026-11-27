import { type Metadata } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Help centre" };

const linkClass =
  "rounded-sm text-ink underline underline-offset-4 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** One question and its answer. Headings rather than a toggle, so everything is readable and findable at once. */
function Question({ q, children }: { q: string; children: ReactNode }): ReactNode {
  return (
    <section className="border-t border-hairline pt-8 first:border-0 first:pt-0">
      <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">{q}</h2>
      <div className="mt-3 flex flex-col gap-4 text-base leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

export default function Page(): ReactNode {
  return (
    <PageShell eyebrow="Resources" title="Help centre" lede="Answers to the questions people ask most. For a walk through the whole product, read the documentation.">
      <div className="flex flex-col gap-10">
        <Question q="When am I charged, and for what?">
          <p>
            Everything our AI or our providers do for you uses credits: searching what is trending, filling in your video, rewriting the script for a new length, making the video, captions, the
            editor&rsquo;s AI and writing your post. Settings, What things cost lists the price of each action at your plan&rsquo;s rate.
          </p>
          <p>
            Credits are held when an action starts, before anything is sent to a provider. When it finishes they are kept, and when it fails they go straight back to your balance. Every charge
            and refund is in your credit history under Settings, Plan and billing. A script already written for the same idea and length in the last 30 minutes is shown again for free.
          </p>
        </Question>
        <Question q="Why was my request refused before it started?">
          <p>
            Usually because your balance does not cover it. On Free, upgrading to Pro fixes it; on Pro, a credit pack does. There is also a daily credit limit that protects accounts from runaway spending. On Pro, a full
            session or weekly limit refuses new work until it refills, unless you have turned on extra usage.
          </p>
        </Question>
        <Question q="What happens if a video fails?">
          <p>
            The credits it held are returned automatically, and the editor tells you so. If you turned on emails under Settings, Notifications, we also email you. Trying again is the right
            response, and a failed attempt costs nothing.
          </p>
        </Question>
        <Question q="How do posting times and time zones work?">
          <p>
            When you post, our AI suggests the best time for your audience and fills in your time zone from your device. Nothing is scheduled until you press Approve. You can change the time or
            the zone first, and change or cancel a scheduled post under Schedule until it goes out.
          </p>
          <p>A post set for 9am stays at 9am across a daylight saving change, because we store your zone rather than a fixed offset.</p>
        </Question>
        <Question q="Which platforms can I post to?">
          <p>
            TikTok, Instagram and YouTube. Connect each one under Settings, Connections. If a platform is not connected, posting to it is refused straight away and names the platform, so you can
            fix it while you are still there.
          </p>
        </Question>
        <Question q="What does deleting my account do?">
          <p>
            If you are on Pro, cancel the subscription first. Then type your account email to confirm. You are signed out at once, and everything you made, including videos, recordings,
            avatars, assets and chats, is erased within minutes. Payment, invoice and credit records are kept as the law requires, without your name or email. This cannot be undone.
          </p>
        </Question>
        <Question q="Is there an API?">
          <p>Not yet. Everything is done in the app for now. Tell us what you would build with one and we will let you know when it is ready.</p>
        </Question>
      </div>
      <div className="mt-12">
        <Prose>
          <p>
            For the whole product step by step, read the{" "}
            <Link className={linkClass} href="/docs">
              documentation
            </Link>
            . If your question is not here, email{" "}
            <a className={linkClass} href="mailto:hello@beyondsocial.app">
              hello@beyondsocial.app
            </a>{" "}
            and we will answer it, then add it here.
          </p>
        </Prose>
      </div>
    </PageShell>
  );
}
