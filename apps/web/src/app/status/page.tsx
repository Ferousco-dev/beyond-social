import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

import { HealthCheck } from "./health-check";

export const metadata: Metadata = { title: "Service status" };

export default function Page(): ReactNode {
  return (
    <PageShell
      eyebrow="Resources"
      title="Service status"
      lede="There is no published status page yet. Rather than a green tick that is true by construction, this page runs one real check from your browser and reports only what that check found."
    >
      <div className="flex flex-col gap-8">
        <HealthCheck />

        <Prose>
          <p>
            The check above is a single request to the health endpoint, made from your browser
            rather than from ours. When it has run, it tells you whether the web app answered you,
            just now. It tells you nothing about the last hour, and it does not cover the parts of
            the system most likely to be the thing that is broken: video generation runs on an
            external provider, and publishing depends on each social platform&rsquo;s own API.
          </p>
          <p>
            We are not recording uptime yet, so we have no history to show and will not print a
            number we did not measure. A hardcoded &ldquo;all systems operational&rdquo; is worse
            than no status page, because it is a claim that survives an outage.
          </p>
          <p>
            If something is not working, email hello@beyondsocial.app. Include what you were doing
            and roughly when. If you have an error with a trace id, send that too: it takes us
            straight to the log line instead of a window to search.
          </p>
          <p>
            When there is uptime worth publishing, this page will publish it, incidents included.
          </p>
        </Prose>
      </div>
    </PageShell>
  );
}
