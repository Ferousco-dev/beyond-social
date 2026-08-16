import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Terms" };

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
      title="Terms"
      lede="What the service does, what you are responsible for, and what we do not promise."
    >
      <div className="flex flex-col gap-10">
        <div className="rounded-2xl border border-hairline bg-paper p-5">
          <Prose>
            <p>
              This is a plain-language description of how the service works, written from the code.
              It has not been reviewed by a lawyer. It will be reviewed before launch, and this note
              comes down when it has been.
            </p>
          </Prose>
        </div>

        <Section title="What the service does">
          <p>
            Beyond Social takes a brief, works it into a prompt, generates video through a model
            provider, and publishes the result to the social accounts you connect. Generation spends
            credits. Your plan sets how many you get and which models you may run.
          </p>
        </Section>

        <Section title="What you are responsible for">
          <p>
            The material you bring. If you upload footage, images, audio, a likeness, a logo, or a
            script, you are saying you have the right to use it that way. We cannot check that, and
            we do not.
          </p>
          <p>
            What you publish. Posting through a connected account is posting as you, under that
            platform&rsquo;s rules. Those rules are theirs to enforce, and an account we cannot see
            into is an account we cannot defend.
          </p>
          <p>
            Your credentials. An API key is shown once, at creation, and stored only as a hash, so a
            key you lose cannot be recovered and has to be revoked and replaced. A key is the whole
            account as far as the API is concerned, including any agent you connect over MCP, so
            treat handing one out as handing over read access.
          </p>
          <p>
            Where you point a webhook. We will POST to the URL you register, signed with your
            secret, and we do not check what is on the other end of it.
          </p>
        </Section>

        <Section title="What we do not promise">
          <p>
            That a generation will be good, or that it will finish. A video model can fail outright,
            or return something unusable, and no amount of prompt work makes that impossible.
          </p>
          <p>
            Credits are taken when a run starts, not when it finishes, so a balance always reflects
            the work already in flight. When a generation fails, it costs nothing: the credits are
            returned to your balance, once, whether it failed before reaching the provider, during
            the render, or as a late reversal afterwards. A generation that finishes and simply is
            not what you wanted is a generation that ran, and it stays spent.
          </p>
          <p>
            We also depend on services we do not run: the model providers, Stripe, and the social
            platforms. When one of them is down, the part of the product that needs it is down.
          </p>
        </Section>

        <Section title="What you keep">
          <p>
            The work is yours. Your projects, uploads, and finished videos belong to you, and we do
            not train a model of our own on your conversations.
          </p>
        </Section>

        <Section title="How an account ends">
          <p>
            You can delete yours whenever you like. Access stops immediately and the data becomes
            eligible for permanent erasure after 30 days. The Privacy page explains why that gap
            exists.
          </p>
          <p>
            We can suspend an account for abuse or non-payment, which stops it writing anything new
            while leaving what is already there readable. If we end an account outright, we will say
            why.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            We will not apply changed terms retroactively without telling you first. Questions go to
            hello@beyondsocial.app.
          </p>
        </Section>
      </div>
    </PageShell>
  );
}
