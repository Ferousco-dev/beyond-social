import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Community" };

export default function Page(): ReactNode {
  return (
    <PageShell
      eyebrow="Resources"
      title="Community"
      lede="There is no community space yet. This page says where to reach us in the meantime, and it will link one the day it exists."
    >
      <Prose>
        <p>
          No Discord, no forum, no Slack. We could open one this afternoon, but an empty room with a
          join button is not a community, and inviting people into it wastes their time before it
          wastes ours. When there are enough people using the product for a conversation between
          them to be worth having, we will open a space and link it here.
        </p>
        <p>
          Until then the route is direct. Email hello@beyondsocial.app for anything about the
          product, how it works, or what it should do next. There is no support tier between you and
          the people building it, because there is no support tier. For a suspected vulnerability,
          use security@beyondsocial.app instead, and the security page explains what happens next.
        </p>
        <p>
          The source is not public. If that changes, the repository will be linked from this page
          rather than announced somewhere you would have to already follow us to see.
        </p>
        <p>
          If you are using the product and something about it is wrong, that is the most useful
          thing you can send us. Concrete beats general: the prompt, what came back, and what you
          expected instead.
        </p>
      </Prose>
    </PageShell>
  );
}
