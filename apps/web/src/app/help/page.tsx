import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Help centre" };

export default function Page(): ReactNode {
  return (
    <PageShell
      eyebrow="Resources"
      title="Help centre"
      lede="Answers to common questions about generation, editing, credits, and publishing."
    >
      <Prose>
        <p>The landing page FAQ covers the most common questions today.</p>
        <p>
          For anything not answered there, email hello@beyondsocial.app and we will help directly
          while we build out the help centre.
        </p>
      </Prose>
    </PageShell>
  );
}
