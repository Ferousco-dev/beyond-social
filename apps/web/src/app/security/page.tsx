import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Security" };

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
      title="Security"
      lede="The measures that are actually in place, and how to tell us about the ones that are not."
    >
      <div className="flex flex-col gap-10">
        <Section title="Access is decided by the database">
          <p>
            Every table has row level security enabled, and the owner policies are written against
            the authenticated user id. An account reads its own rows and nothing else. This sits
            below the application deliberately: a filter in application code is one careless edit
            away from being dropped, and a policy is not.
          </p>
          <p>
            Suspension and deletion are enforced the same way. A deleted account is blocked from
            reading and writing by a restrictive policy that composes with the existing ones, so the
            block cannot be bypassed by finding a code path that forgot to check.
          </p>
        </Section>

        <Section title="Secrets are stored so they cannot be read back">
          <p>
            API keys are stored as a SHA-256 hash plus a short prefix for display. The full key is
            shown once, at creation. A stolen database dump yields nothing that authenticates.
          </p>
          <p>
            Outbound webhook signing keys work the same way, and go further: the digest column is
            revoked from client roles, so a browser session cannot receive even the hash. We
            genuinely cannot show a signing secret again, and rotation is the only recovery path.
            That is the honest cost of not being able to leak it.
          </p>
          <p>
            The admin console tracks which platform secrets are set and when they were last rotated.
            It stores no plaintext value and there is no function that returns one, so no privileged
            screen can print a live credential.
          </p>
        </Section>

        <Section title="Webhooks are signed in both directions">
          <p>
            Webhooks we send carry a timestamp and an HMAC over that timestamp joined to the raw
            body. Signing the body alone would leave the timestamp unauthenticated and let a
            captured payload be replayed under a fresh one, so both are covered and signatures
            expire.
          </p>
          <p>
            Stripe webhooks we receive are verified against the raw body before anything in them is
            trusted. An unsigned or badly signed call is rejected at the door.
          </p>
        </Section>

        <Section title="The audit log cannot be edited">
          <p>
            Every privileged admin action is written to an append-only log. Update and delete are
            revoked at the table level, no policy grants them, and a trigger raises if either is
            attempted anyway. A log an administrator can quietly rewrite is not a log.
          </p>
        </Section>

        <Section title="Other measures">
          <p>
            Privileged operations run server-side only, service role credentials never reach the
            browser, and rate limits on authentication are counted in the database rather than in
            process memory, so spreading attempts across serverless instances does not buy a fresh
            budget.
          </p>
          <p>
            Text derived from your own messages, such as memories and thread summaries, is fenced
            and labelled when it is placed in a prompt. Fencing alone is not a guarantee. What makes
            it safe enough is that your stored text can only ever influence your own generations:
            there is no path from one account&rsquo;s content into another account&rsquo;s prompt.
          </p>
        </Section>

        <Section title="Reporting a vulnerability">
          <p>
            Email security@beyondsocial.app with what you found and how to reproduce it. We will
            acknowledge it and tell you what we are doing about it. Please give us a chance to fix
            the issue before you publish it, and please do not access, alter, or delete data that is
            not yours while testing.
          </p>
          <p>We do not run a paid bounty programme, and we would rather say that than imply one.</p>
        </Section>
      </div>
    </PageShell>
  );
}
