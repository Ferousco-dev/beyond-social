"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateLegalDocument } from "@/features/admin/actions/legal";
import { type LegalDocument, type LegalDocumentKind } from "@/lib/legal/documents";

const FIELD =
  "mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function LegalDocumentEditor({
  kind,
  initial,
}: {
  readonly kind: LegalDocumentKind;
  readonly initial: LegalDocument;
}) {
  const [document, setDocument] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(): void {
    setMessage(null);
    startTransition(() => {
      void updateLegalDocument({ kind, document }).then((result) => {
        setFailed(!result.ok);
        setMessage(result.ok ? "Saved." : result.error);
      });
    });
  }

  return (
    <section className="rounded-xl border border-hairline bg-paper p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold capitalize text-ink">{kind}</h2>
        <label className="flex items-center gap-2 text-xs font-medium text-ink-soft">
          Publication status
          <select
            value={document.status}
            onChange={(event) =>
              setDocument({ ...document, status: event.target.value as LegalDocument["status"] })
            }
            className="h-10 rounded-lg border border-input bg-card px-3 text-sm text-ink"
          >
            <option value="coming_soon">Coming soon</option>
            <option value="published">Published</option>
          </select>
        </label>
      </div>

      <label className="mt-4 block text-xs font-medium text-ink-soft">
        Title
        <Input
          value={document.title}
          maxLength={100}
          onChange={(event) => setDocument({ ...document, title: event.target.value })}
          className="mt-1.5"
        />
      </label>
      <label className="mt-4 block text-xs font-medium text-ink-soft">
        Summary
        <Input
          value={document.summary}
          maxLength={240}
          onChange={(event) => setDocument({ ...document, summary: event.target.value })}
          className="mt-1.5"
        />
      </label>
      <label className="mt-4 block text-xs font-medium text-ink-soft">
        Body
        <textarea
          value={document.body}
          maxLength={12_000}
          rows={10}
          onChange={(event) => setDocument({ ...document, body: event.target.value })}
          className={FIELD}
        />
      </label>

      <div className="mt-4 flex items-center gap-3">
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save document"}
        </Button>
        {message ? (
          <p
            role={failed ? "alert" : "status"}
            className={failed ? "text-xs text-destructive" : "text-xs text-ink-soft"}
          >
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
