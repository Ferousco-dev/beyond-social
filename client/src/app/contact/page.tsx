import Link from "next/link";
import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Get in touch" };

const linkClass =
  "rounded-sm text-ink underline underline-offset-4 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

type Route = { label: string; body: ReactNode };

const routes: Route[] = [
  {
    label: "Anything else",
    body: (
      <>
        Product questions, partnerships, press, and applications go to{" "}
        <a className={linkClass} href="mailto:hello@beyondsocial.app">
          hello@beyondsocial.app
        </a>
        .
      </>
    ),
  },
  {
    label: "Your account",
    body: (
      <>
        Billing, data, and deletion requests go to{" "}
        <a className={linkClass} href="mailto:support@beyondsocial.app">
          support@beyondsocial.app
        </a>
        . Include the email address the account was created with, and never send us a password.
      </>
    ),
  },
  {
    label: "Security",
    body: (
      <>
        Suspected vulnerabilities go to{" "}
        <a className={linkClass} href="mailto:security@beyondsocial.app">
          security@beyondsocial.app
        </a>
        , not to the addresses above. The{" "}
        <Link className={linkClass} href="/security">
          security page
        </Link>{" "}
        explains what we do with a report.
      </>
    ),
  },
];

export default function Page(): ReactNode {
  return (
    <PageShell
      eyebrow="Company"
      title="Get in touch"
      lede="Email is the only way to reach us. There is no phone line and no support desk, so here is exactly which address goes where."
    >
      <Prose>
        <dl className="flex flex-col gap-6">
          {routes.map((route) => (
            <div key={route.label} className="border-t border-hairline pt-5">
              <dt className="text-sm font-medium text-ink">{route.label}</dt>
              <dd className="mt-2 text-ink-soft">{route.body}</dd>
            </div>
          ))}
        </dl>
        <p>
          The product is still in development and the team is small, so we cannot promise a response
          time and none of these addresses is watched around the clock. That is worth saying plainly
          rather than letting the word support imply a desk that does not exist.
        </p>
      </Prose>
    </PageShell>
  );
}
