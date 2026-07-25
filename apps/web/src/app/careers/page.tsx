import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Work with us" };

export default function Page(): ReactNode {
  return (
    <PageShell
      eyebrow="Company"
      title="Work with us"
      lede="We are a small team building an AI product where quality of output is the entire proposition."
    >
      <Prose>
        <p>
          We are not running a formal hiring process yet. When roles open they will be listed here,
          with the scope and expectations written out in full.
        </p>
        <p>
          If you build tools, care about craft, and want to work on this problem, reach out and tell
          us what you have made.
        </p>
      </Prose>
    </PageShell>
  );
}
