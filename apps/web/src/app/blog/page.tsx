import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Notes" };

export default function Page(): ReactNode {
  return (
    <PageShell
      eyebrow="Company"
      title="Notes"
      lede="Writing on what we learn building an AI video engine: retrieval, evaluation, and the craft of directing a model."
    >
      <Prose>
        <p>
          We are preparing the first posts now. They will cover the architecture of the prompt
          intelligence engine and what we learned making generated video look intentional.
        </p>
        <p>Nothing published yet. Check back shortly.</p>
      </Prose>
    </PageShell>
  );
}
