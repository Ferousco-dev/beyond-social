import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Documentation" };

export default function Page(): ReactNode {
  return (
    <PageShell
      eyebrow="Resources"
      title="Documentation"
      lede="Guides for getting the most out of the engine, from your first prompt to publishing on a schedule."
    >
      <Prose>
        <p>
          Documentation is being written alongside the product so it stays accurate rather than
          aspirational.
        </p>
        <p>
          In the meantime, the prompting guidance built into the product covers shot structure,
          camera movement, lighting, and platform formats.
        </p>
      </Prose>
    </PageShell>
  );
}
