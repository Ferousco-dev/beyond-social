import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Get in touch" };

export default function Page(): ReactNode {
  return (
    <PageShell
      eyebrow="Company"
      title="Get in touch"
      lede="Questions about the product, partnerships, or press are all welcome."
    >
      <Prose>
        <p>The fastest way to reach us is by email. We read everything and reply to what we can.</p>
        <p>
          Reach us at hello@beyondsocial.app. If you are reporting a security issue, please see the
          security page instead.
        </p>
      </Prose>
    </PageShell>
  );
}
