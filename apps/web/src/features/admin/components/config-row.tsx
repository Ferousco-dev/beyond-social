"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { type AppConfigRow } from "@/lib/dashboard/admin";
import { setAppConfig } from "../actions/config";

/** One editable config value, with a type-appropriate control and a save button that only shows once changed. */
export function ConfigRow({ row }: { readonly row: AppConfigRow }) {
  const router = useRouter();
  const [draft, setDraft] = useState(row.value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = JSON.stringify(draft) !== JSON.stringify(row.value);

  function save() {
    setError(null);
    startTransition(() => {
      const value = draft as string | number | boolean | Record<string, unknown> | unknown[];
      void setAppConfig({ key: row.key, value }).then((result) => {
        if (!result.ok) setError(result.error);
        else router.refresh();
      });
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-mono text-xs text-ink">{row.key}</p>
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              row.takesEffect === "immediate" ? "bg-success/10 text-success" : "bg-cloud text-ink-soft"
            }`}
          >
            {row.takesEffect === "immediate" ? "immediate" : "needs redeploy"}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-ink-soft">{row.description}</p>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {row.valueType === "boolean" ? (
          <Switch
            checked={draft === true}
            onCheckedChange={(checked) => setDraft(checked)}
            aria-label={`Toggle ${row.key}`}
          />
        ) : row.valueType === "number" ? (
          <Input
            type="number"
            value={String(draft)}
            onChange={(event) => setDraft(Number(event.target.value))}
            className="h-9 w-28"
          />
        ) : row.valueType === "json" ? (
          <textarea
            value={JSON.stringify(draft)}
            onChange={(event) => {
              try {
                setDraft(JSON.parse(event.target.value) as typeof draft);
              } catch {
                // Ignored while typing: the field keeps the last valid parse
                // until the input becomes valid JSON again.
              }
            }}
            className="h-9 w-48 rounded-lg border border-input bg-card px-2 py-1 font-mono text-xs"
          />
        ) : (
          <Input
            value={String(draft)}
            onChange={(event) => setDraft(event.target.value)}
            className="h-9 w-40"
          />
        )}
        {dirty && (
          <Button type="button" size="sm" disabled={pending} onClick={save}>
            {pending ? "Saving…" : "Save"}
          </Button>
        )}
      </div>
    </li>
  );
}
