"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import { type CredentialStatus } from "@/lib/go-api/admin-schemas";
import { cn } from "@/lib/utils";

import { clearProviderKey, saveProviderKey } from "../actions";
import { useAdminAction } from "../use-admin-action";

const LABELS: Readonly<Record<string, string>> = {
  apify: "Apify",
  kie: "KIE",
  kie_webhook_hmac: "KIE webhook key",
  gemini: "Gemini",
  alert_webhook: "Alert webhook",
  resend_api_key: "Resend",
  stripe_secret_key: "Stripe secret key",
  stripe_webhook_secret: "Stripe webhook secret",
  youtube_client_id: "YouTube client ID",
  youtube_client_secret: "YouTube client secret",
  tiktok_client_key: "TikTok client key",
  tiktok_client_secret: "TikTok client secret",
  meta_app_id: "Meta app ID",
  meta_app_secret: "Meta app secret",
};

const ITEM =
  "flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm text-ink outline-none data-[highlighted]:bg-cloud data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

/** One key: its name and state, and a menu to replace or remove it. Saving tests the key first. */
export function ProviderKeyForm({ credential, writable }: { readonly credential: CredentialStatus; readonly writable: boolean }): ReactNode {
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState(false);
  const { pending, error, run } = useAdminAction();
  const label = LABELS[credential.name] ?? credential.name;
  const set = credential.source !== "missing";

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    run(
      () => saveProviderKey(credential.name, value),
      () => {
        setValue("");
        setEditing(false);
      },
    );
  };

  return (
    <li className="px-4 py-2">
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{label}</p>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs", set ? "bg-success/10 text-success" : "bg-cloud text-ink-soft")}>
          {set ? `Set${credential.last4 ? ` · ${credential.last4}` : ""}` : "Not set"}
        </span>
        {writable ? (
          set ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button type="button" aria-label={`Options for ${label}`} className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-ink-soft hover:bg-cloud hover:text-ink">
                  <MoreHorizontal className="size-4" aria-hidden />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={4} className="z-50 min-w-40 rounded-xl border border-hairline bg-paper p-1 shadow-lg">
                  <DropdownMenu.Item className={ITEM} onSelect={() => setEditing(true)}>
                    <RefreshCw className="size-3.5 text-ink-soft" aria-hidden />
                    Replace key
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={cn(ITEM, "text-destructive")}
                    disabled={credential.source !== "vault" || pending}
                    onSelect={() => run(() => clearProviderKey(credential.name))}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    Remove
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="btn btn-secondary btn-sm h-7 px-2.5 text-xs">
              Add key
            </button>
          )
        ) : null}
      </div>
      {editing ? (
        <form onSubmit={submit} className="mt-3 flex gap-2">
          <input
            type="password"
            autoComplete="off"
            autoFocus
            aria-label={`New key for ${label}`}
            placeholder="Paste the key"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="h-9 min-w-0 flex-1 rounded-lg border border-hairline bg-paper px-3 text-sm text-ink"
          />
          <button type="submit" disabled={pending || value.trim() === ""} className="btn btn-primary btn-md">
            {pending ? "Checking…" : "Save"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost btn-md">
            Cancel
          </button>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </li>
  );
}
