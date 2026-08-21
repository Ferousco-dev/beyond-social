"use client";

import { Check, Copy, KeyRound, Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { useConfirm } from "@/components/ui/use-confirm";
import { type ApiKeySummary } from "@/lib/dashboard/api-keys";

import { createApiKey, revokeApiKey } from "../actions";

/** Creates and lists API keys. The plaintext is shown once and never again. */
export function ApiKeyManager({ keys }: { keys: readonly ApiKeySummary[] }) {
  const { confirm, dialog } = useConfirm();
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      {dialog}
      <div className="space-y-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setMessage(null);
            startTransition(async () => {
              const result = await createApiKey({ name });
              if (result.status === "ok") {
                setFresh(result.plaintext);
                setCopied(false);
                setName("");
              } else {
                setMessage(result.message);
              }
            });
          }}
          className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-paper p-5"
        >
          <label className="sr-only" htmlFor="key-name">
            Key name
          </label>
          <input
            id="key-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="What is this key for?"
            className="h-9 min-w-52 flex-1 rounded-lg border border-hairline bg-canvas px-3 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
          <button
            type="submit"
            disabled={pending || name.trim() === ""}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3.5 text-sm font-medium text-canvas transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Create key
          </button>
          {message ? (
            <p role="alert" className="w-full text-xs text-destructive">
              {message}
            </p>
          ) : null}
        </form>

        {fresh ? (
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
            <p className="text-sm font-medium text-ink">Copy this key now</p>
            <p className="mt-1 text-xs text-ink-soft">
              It is stored only as a hash, so this is the one time it can be shown.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-hairline bg-canvas px-3 py-2 text-xs text-ink">
                {fresh}
              </code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(fresh).then(() => setCopied(true));
                }}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-hairline px-3 text-xs font-medium text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        ) : null}

        {keys.length > 0 ? (
          <ul className="space-y-2">
            {keys.map((key) => (
              <li
                key={key.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-paper p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cloud text-ink-soft">
                    <KeyRound className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{key.name}</p>
                    <p className="text-xs tabular-nums text-ink-soft">
                      {key.keyPrefix}… ·{" "}
                      {key.revokedAt
                        ? "revoked"
                        : key.lastUsedAt
                          ? `last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                          : "never used"}
                    </p>
                  </div>
                </div>
                {key.revokedAt ? null : (
                  <button
                    type="button"
                    onClick={() => {
                      /*
                       * Asked for, because a revoke is felt somewhere else. The
                       * key is in somebody's deployed code, revoking breaks it
                       * the moment it happens, and there is no un-revoke: the fix
                       * is a new key and a redeploy.
                       */
                      void (async () => {
                        const agreed = await confirm({
                          title: `Revoke ${key.name}?`,
                          description:
                            "Anything using this key stops working immediately. It cannot be un-revoked, so you would need to create a new key and update wherever it is used.",
                          confirmLabel: "Revoke it",
                          tone: "destructive",
                        });
                        if (!agreed) return;
                        startTransition(() => void revokeApiKey(key.id));
                      })();
                    }}
                    disabled={pending}
                    className="shrink-0 rounded-full border border-hairline px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-destructive/40 hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
                  >
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={KeyRound}
            title="No API keys yet"
            body="Create one to call the API from your own code. Keys carry your access, so treat them like passwords."
          />
        )}
      </div>
    </>
  );
}
