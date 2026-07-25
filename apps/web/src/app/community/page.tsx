import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Community" };

export default function Page(): ReactNode {
  return (
    <PageShell
      eyebrow="Resources"
      title="Community"
      lede="A place for creators using the product to compare notes on what actually performs."
    >
      <Prose>
        <p>
          We are opening the community once there are enough people using the product for it to be
          useful rather than empty.
        </p>
        <p>Want an early invite? Let us know.</p>
      </Prose>
    </PageShell>
  );
}
