import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Service status" };

export default function Page(): ReactNode {
  return (
    <PageShell
      eyebrow="Resources"
      title="Service status"
      lede="Live availability of generation, publishing, and the API."
    >
      <Prose>
        <p>
          A public status page will be published with the production launch, reporting uptime and
          incidents honestly.
        </p>
        <p>For urgent issues during the current phase, contact us directly.</p>
      </Prose>
    </PageShell>
  );
}
