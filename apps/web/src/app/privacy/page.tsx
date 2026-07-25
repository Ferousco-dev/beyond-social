import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Privacy" };

export default function Page(): ReactNode {
  return (
    <PageShell eyebrow="Legal" title="Privacy" lede="How we handle your data, in plain language.">
      <Prose>
        <p>
          Our full privacy policy is being finalised with counsel ahead of launch, and we would
          rather publish nothing than publish something inaccurate.
        </p>
        <p>
          In short: we collect what is needed to run the product, we do not sell personal data, and
          content you create belongs to you. Questions before the full policy is published? Email
          us.
        </p>
      </Prose>
    </PageShell>
  );
}
