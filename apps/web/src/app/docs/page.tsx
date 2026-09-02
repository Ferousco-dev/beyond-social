import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";
import { ApiReference } from "@/features/docs/components/api-reference";
import { McpReference } from "@/features/docs/components/mcp-reference";
import { WebhooksReference } from "@/features/docs/components/webhooks-reference";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "The Beyond Social API, webhooks, and MCP endpoint: authentication, the endpoints that exist today, and how to verify a delivery.",
};

const linkClass =
  "rounded-sm text-ink underline underline-offset-4 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/**
 * Everything a machine can do with an account, on one page.
 *
 * Three surfaces, one document. They share a key, a plan, and a rate limit, and
 * splitting them across three pages would mean saying that three times and
 * having it drift twice.
 *
 * The sections read their own constants: header names come from the webhook
 * contract, the tool list from the MCP catalogue, the plan from the billing
 * catalogue. Documentation that restates a constant is documentation that goes
 * stale the first time the constant moves.
 */
export default function Page(): ReactNode {
  return (
    <PageShell
      eyebrow="Resources"
      title="Documentation"
      lede="The API as it exists today: read-only, small, and documented in full rather than previewed. Webhooks tell you when something finished; MCP hands the same reads to an agent."
    >
      <div className="flex flex-col gap-10">
        <ApiReference />
        <WebhooksReference />
        <McpReference />
      </div>

      <div className="mt-12">
        <Prose>
          <p>
            If anything here does not match what the API returns, that is a bug in this page and we
            want to know:{" "}
            <a className={linkClass} href="mailto:hello@beyondsocial.app">
              hello@beyondsocial.app
            </a>
            .
          </p>
        </Prose>
      </div>
    </PageShell>
  );
}
