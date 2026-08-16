import { type ReactNode } from "react";

import { MCP_TOOL_SUMMARIES } from "@/lib/mcp/catalogue";

import { Code, Section, Term } from "./doc-primitives";

/**
 * How an agent connects. The tool list is imported from the server's own
 * catalogue, so a tool added or renamed cannot leave this page describing a set
 * that no longer exists.
 */

const CONFIG = `{
  "mcpServers": {
    "beyond-social": {
      "url": "https://beyondsocial.app/api/mcp",
      "headers": { "Authorization": "Bearer bsk_your_key_here" }
    }
  }
}`;

const CALL = `curl https://beyondsocial.app/api/mcp \\
  -H "Authorization: Bearer bsk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;

export function McpReference(): ReactNode {
  return (
    <>
      <Section title="MCP">
        <p>
          <Term>POST /api/mcp</Term> speaks the Model Context Protocol, so an AI agent can read your
          account as tools rather than as documentation. It takes the same API key as a bearer token
          and is on the same plan.
        </p>
        <p>
          The server is stateless: there is no session to establish, no id to carry, and no stream
          to hold open. Every request stands alone, which means a client needs one URL and one
          header.
        </p>
        <Code>{CONFIG}</Code>
      </Section>

      <Section title="Tools">
        <p>
          Read-only, deliberately. A tool that starts a render spends real money on behalf of
          someone who is not watching, so writing waits until the product has a confirmation step
          worth trusting.
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          {MCP_TOOL_SUMMARIES.map((tool) => (
            <li key={tool.name}>
              <Term>{tool.name}</Term> · {tool.description}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Calling it directly">
        <p>
          It is ordinary JSON-RPC 2.0 over HTTP, so it can be driven with curl.{" "}
          <Term>initialize</Term>, <Term>ping</Term>, <Term>tools/list</Term>, and{" "}
          <Term>tools/call</Term> are handled; anything else returns <Term>-32601</Term>. A
          notification, meaning a request with no <Term>id</Term>, is acknowledged with 202 and no
          body.
        </p>
        <Code>{CALL}</Code>
        <p>
          A tool that fails returns a normal result with <Term>isError</Term> set, not a JSON-RPC
          error. The distinction is the protocol&rsquo;s: a transport error means the server could
          not run the tool, while <Term>isError</Term> means the tool ran and failed, and an agent
          can only react sensibly to the second if we do not report it as the first.
        </p>
      </Section>
    </>
  );
}
