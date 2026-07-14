import { type ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface StackEntry {
  readonly label: string;
  readonly value: string;
}

const STACK: readonly StackEntry[] = [
  { label: "Frontend", value: "Next.js on Vercel" },
  { label: "API layer", value: "Node.js" },
  { label: "Data", value: "Supabase" },
  { label: "Queue", value: "BullMQ + Redis" },
  { label: "Payments", value: "Stripe + Apple Pay" },
  { label: "Publishing", value: "Upload-post" },
];

export default function HomePage(): ReactNode {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Beyond Social
        </p>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Foundation ready.
        </h1>
        <p className="mb-8 max-w-xl text-[17px] text-muted-foreground">
          The monorepo scaffold is in place: strict TypeScript, linting, a typed environment
          boundary, and the full dependency stack across the web app and background worker.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <a href="/api/health">Check web health</a>
          </Button>
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm text-muted-foreground">
            <span className="size-2 rounded-full bg-success" aria-hidden="true" />
            Web service healthy
          </span>
        </div>

        <dl className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {STACK.map((entry) => (
            <div key={entry.label} className="flex flex-col gap-1 bg-card p-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {entry.label}
              </dt>
              <dd className="m-0 text-[15px] font-medium">{entry.value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-10 text-sm text-muted-foreground">
          Health endpoint: <span className="font-mono text-sm">GET /api/health</span>
        </p>
      </div>
    </main>
  );
}
