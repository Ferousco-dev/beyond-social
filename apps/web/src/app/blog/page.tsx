import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Notes" };

export default function Page(): ReactNode {
  return (
    <PageShell
      eyebrow="Company"
      title="Notes"
      lede="Working notes on building an AI video engine: retrieval, evaluation, and what it takes to make a generated shot look directed."
    >
      <Prose>
        <p>
          There is nothing here yet. This page will hold notes written while building the product,
          which means the first one gets published when there is a result worth reporting rather
          than on a schedule. We would rather leave it empty than fill it with posts that exist to
          be posted.
        </p>
        <p>
          The subjects are already obvious to us: how craft knowledge is retrieved and assembled
          into a prompt, how to judge output quality without watching every frame by hand, what the
          generation actually costs to run, and the times a change made the video worse. If you want
          to be told when the first note goes up, email hello@beyondsocial.app.
        </p>
      </Prose>
    </PageShell>
  );
}
