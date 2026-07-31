import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Help centre" };

/** One question and its answer. Headings rather than a toggle, so everything is readable and findable at once. */
function Question({ q, children }: { q: string; children: ReactNode }): ReactNode {
  return (
    <section className="border-t border-hairline pt-8 first:border-0 first:pt-0">
      <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">{q}</h2>
      <div className="mt-3 flex flex-col gap-4 text-base leading-relaxed text-ink-soft">
        {children}
      </div>
    </section>
  );
}

export default function Page(): ReactNode {
  return (
    <PageShell
      eyebrow="Resources"
      title="Help centre"
      lede="The questions this product actually raises, answered against what the code does rather than what would sound reassuring."
    >
      <div className="flex flex-col gap-10">
        <Question q="When am I charged for a generation?">
          <p>
            When it finishes successfully, not when you press the button. Your plan and your balance
            are checked first, before anything is sent to the provider, and a run that cannot be
            paid for is refused at that point with the reason named. The credit is deducted only
            when the video comes back ready.
          </p>
          <p>
            A failed generation costs nothing. If a run was charged and the provider later reversed
            it, the charge is refunded once, and the refund appears in your credit history as
            &ldquo;Refund, generation failed&rdquo;. Credits do not expire.
          </p>
        </Question>

        <Question q="Why was my run refused before it started?">
          <p>
            For one of two separate reasons, and the message says which. Either the model sits on a
            higher plan than yours, in which case buying credits will not help and the plan has to
            change, or the plan allows it and your balance does not cover the run, in which case a
            top-up does. Keeping those apart matters: the worst possible message is telling someone
            to buy credits for a model their plan does not include.
          </p>
        </Question>

        <Question q="Why does a generation fail once it has started?">
          <p>
            Because the run is handed to a video model that can reject or abandon it. When that
            happens the generation is marked failed, the provider&rsquo;s error is kept on the row
            so support can read it, and you are not charged. Retrying is the right response, and it
            costs nothing to have failed.
          </p>
        </Question>

        <Question q="How does scheduling handle time zones?">
          <p>
            You pick a wall clock time and a zone. The zone is stored rather than an offset, and the
            time you picked is converted to the exact instant it refers to. The publishing worker
            only ever compares instants, so a post set for 9am stays at 9am across a daylight saving
            change instead of drifting by an hour.
          </p>
          <p>
            Submitting the same schedule twice, by double clicking or by a retried form, does not
            create a second post. Each submission carries a key that lands on the same row.
          </p>
        </Question>

        <Question q="What happens if a platform is not connected?">
          <p>
            The schedule is refused straight away and names the platforms that are not connected.
            That is deliberate. Accepting it would leave a post sitting in the queue until the
            worker could not authenticate, and a failure an hour later tells you nothing at the
            moment you could still have acted.
          </p>
          <p>
            Each platform is connected independently under Settings, Connections. TikTok, Instagram,
            Facebook, and YouTube each require their own app review, so they do not become available
            on the same day.
          </p>
        </Question>

        <Question q="What does deleting my account actually do?">
          <p>
            It flags the account as deleted and signs you out. Nothing is destroyed at that moment:
            your row and everything you made are still there, and the database starts a 30 day grace
            period before the account becomes eligible for permanent erasure. Erasure after that is
            a deliberate act, not an automatic one.
          </p>
          <p>
            From the moment you confirm, the account can no longer read its own data. That includes
            the API: any key you created beforehand stops working immediately. Signing in again
            tells you the account was deleted rather than showing a password error, because no
            password can fix that state and you would otherwise keep resetting it.
          </p>
          <p>
            Within the grace period a restore is possible. Email support@beyondsocial.app from the
            address on the account.
          </p>
        </Question>

        <Question q="Can I call any of this from my own code?">
          <p>
            Partly. There is a read-only API for listing your generations and reading your usage,
            documented on the documentation page. There is no endpoint that starts a generation or
            schedules a post yet, and this page will not pretend otherwise.
          </p>
        </Question>
      </div>

      <div className="mt-12">
        <Prose>
          <p>
            If your question is not here, email hello@beyondsocial.app. We would rather answer it
            directly and then add it to this page than leave you guessing.
          </p>
        </Prose>
      </div>
    </PageShell>
  );
}
