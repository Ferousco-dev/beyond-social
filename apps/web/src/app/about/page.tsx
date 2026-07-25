import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Building Beyond Social" };

export default function Page(): ReactNode {
  return (
    <PageShell
      eyebrow="Company"
      title="Building Beyond Social"
      lede="We are building the tool we wanted: something that turns an idea into a finished, publishable video without flattening the craft that makes video worth watching."
    >
      <Prose>
        <p>
          Beyond Social pairs a video generation model with a curated knowledge base of
          cinematography, lighting, pacing, and platform craft, so output reads as directed rather
          than generated.
        </p>
        <p>
          The product is in active development. If you would like to follow along or shape where it
          goes, we would like to hear from you.
        </p>
      </Prose>
    </PageShell>
  );
}
