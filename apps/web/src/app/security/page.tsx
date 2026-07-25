import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Security" };

export default function Page(): ReactNode {
  return (
    <PageShell
      eyebrow="Legal"
      title="Security"
      lede="How we protect accounts, content, and infrastructure."
    >
      <Prose>
        <p>
          Access is scoped per user at the database level, privileged operations run server-side
          only, and secrets are never exposed to the browser.
        </p>
        <p>
          If you believe you have found a vulnerability, email security@beyondsocial.app and we will
          respond as quickly as we can.
        </p>
      </Prose>
    </PageShell>
  );
}
