"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type CredentialStatus } from "@/lib/go-api/admin-schemas";

import { clearProviderKey, saveProviderKey } from "../actions";
import { useAdminAction } from "../use-admin-action";

const LABELS: Readonly<Record<string, string>> = {
  apify: "Apify (trend discovery)",
  kie: "KIE (video transformation)",
  kie_webhook_hmac: "KIE webhook signing key",
  heygen: "HeyGen (avatars)",
  heygen_webhook_secret: "HeyGen webhook secret",
  gemini: "Gemini (planning)",
  openrouter: "OpenRouter (other models)",
  youtube_client_id: "YouTube sign-in: client ID",
  youtube_client_secret: "YouTube sign-in: client secret",
  tiktok_client_key: "TikTok sign-in: client key",
  tiktok_client_secret: "TikTok sign-in: client secret",
  meta_app_id: "Instagram sign-in (Meta): app ID",
  meta_app_secret: "Instagram sign-in (Meta): app secret",
};

const SOURCE_TEXT = {
  vault: "Saved here",
  environment: "From server settings",
  missing: "Not set",
} as const;

export function ProviderKeyForm({
  credential,
  writable,
}: {
  readonly credential: CredentialStatus;
  readonly writable: boolean;
}): ReactNode {
  const [value, setValue] = useState("");
  const { pending, error, run } = useAdminAction();
  const label = LABELS[credential.name] ?? credential.name;

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    run(() => saveProviderKey(credential.name, value), () => setValue(""));
  };

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-ink-soft">
          {SOURCE_TEXT[credential.source]}
          {credential.last4 ? ` · ends in ${credential.last4}` : ""}
        </p>
      </div>
      {writable ? (
        <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            type="password"
            autoComplete="off"
            aria-label={`New key for ${label}`}
            placeholder="Paste a new key"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <Button type="submit" disabled={pending || value.trim() === ""}>
            {pending ? "Checking" : "Save"}
          </Button>
          {credential.source === "vault" ? (
            <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => clearProviderKey(credential.name))}>
              Remove
            </Button>
          ) : null}
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </li>
  );
}
