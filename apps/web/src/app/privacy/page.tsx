import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Privacy" };

function Section({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <section className="border-t border-hairline pt-8">
      <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      <div className="mt-4">
        <Prose>{children}</Prose>
      </div>
    </section>
  );
}

export default function Page(): ReactNode {
  return (
    <PageShell
      eyebrow="Legal"
      title="Privacy"
      lede="What the product stores, who can read it, and where it goes when it leaves us."
    >
      <div className="flex flex-col gap-10">
        <div className="rounded-2xl border border-hairline bg-paper p-5">
          <Prose>
            <p>
              This is a plain-language description of how the system works, written from the code
              and the database schema. It has not been reviewed by a lawyer and it is not a
              contract. It will be reviewed before launch, and this note comes down when it has
              been.
            </p>
          </Prose>
        </div>

        <Section title="What we store">
          <p>
            Account details: your email address, your plan, your credit balance, and the timezone
            you set, which exists so scheduled posts land at the local hour you meant.
          </p>
          <p>
            Your work: the projects you create, every prompt and message in a thread, files you
            upload, and the videos that come back from generation. Finished renders are copied into
            our own storage, because the provider result URLs expire.
          </p>
          <p>
            Long-term memories: durable facts the system derives from your conversations, such as a
            standing preference for vertical framing, or who your audience is. Extraction is
            deliberately conservative and most turns produce nothing. Your own messages are also
            embedded so that past threads can be found by meaning rather than keyword. Assistant
            replies are not embedded, and very short messages are skipped.
          </p>
          <p>
            Usage records: which model ran, what it cost in credits, whether it succeeded, the
            provider&rsquo;s reason when it did not, and enough of a trace to answer a billing
            question later.
          </p>
          <p>
            Integration credentials, if you make any. An API key is stored as a hash and cannot be
            recovered. A webhook signing secret is stored encrypted, because signing a delivery
            needs the secret itself, and the key that decrypts it is held outside the database.
          </p>
        </Section>

        <Section title="Who can read it">
          <p>
            Every table carries row level security, so access is decided by the database rather than
            by application code that a later edit could quietly drop. One account cannot read
            another account&rsquo;s rows, including memories, even when querying by a known id.
          </p>
          <p>
            Administrators are a deliberate exception with a deliberate limit. They can see facts
            about an account: plan, credits, when it was last active, how many messages it has. They
            cannot read the messages themselves. There is no admin read policy on the message table,
            so the console can count your conversations and cannot open them. That limit is a choice
            worth naming, because it would have been easier not to make it.
          </p>
        </Section>

        <Section title="Who else receives it">
          <p>
            Generation providers. Prompts and reference material go to kie.ai to render video, and
            to the language model providers we run text through: Anthropic, OpenAI, and Google.
            Voyage receives message text to turn into the embeddings that make recall and search
            work.
          </p>
          <p>
            Stripe handles payment. Card details go to Stripe and never reach our servers or our
            database.
          </p>
          <p>
            The platforms you connect. When you publish, the video and its caption go to TikTok,
            Instagram, Facebook, or YouTube, whichever you connected, through that platform&rsquo;s
            own API. We integrate each one directly rather than through an aggregator, so nothing
            passes through a middleman not named here.
          </p>
          <p>
            Anywhere you point us. If you register a webhook endpoint, we POST what happened, signed
            with your secret, to the URL you gave us. If you connect an AI agent over MCP, that
            agent reads your generations, usage, and balance with the key you handed it. Both are
            your choice and both are revocable from Settings; what leaves this way leaves because
            you asked it to.
          </p>
          <p>We do not sell personal data.</p>
        </Section>

        <Section title="Deleting your account">
          <p>
            Deletion does not erase anything at the moment you ask for it. The account is marked
            deleted and immediately loses the ability to read or write its own data, enforced in the
            database rather than in the interface. After 30 days it becomes eligible for permanent
            erasure.
          </p>
          <p>
            The delay is not a retention trick. A deletion is often a mistake or a bad afternoon,
            and a cascade has no undo. The window is also what lets us answer a billing dispute or
            an abuse report about work that was already published. Erasure after the window is a
            deliberate step someone takes rather than a scheduled job, because an automated
            irreversible delete is how data disappears by accident.
          </p>
        </Section>

        <Section title="Questions">
          <p>
            Email hello@beyondsocial.app. If something here does not match what the product does,
            tell us and we will fix the page or the product, whichever one is wrong.
          </p>
        </Section>
      </div>
    </PageShell>
  );
}
