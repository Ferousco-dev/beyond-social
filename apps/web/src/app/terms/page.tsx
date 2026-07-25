import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Terms" };

export default function Page(): ReactNode {
  return (
    <PageShell eyebrow="Legal" title="Terms" lede="The agreement between you and Beyond Social.">
      <Prose>
        <p>
          Our terms of service are being finalised with counsel ahead of launch. This page will
          carry the complete document when it is ready.
        </p>
        <p>We will not apply terms retroactively without telling you first.</p>
      </Prose>
    </PageShell>
  );
}
