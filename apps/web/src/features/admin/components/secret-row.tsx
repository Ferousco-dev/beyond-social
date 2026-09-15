"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/use-confirm";
import { type ManagedSecret } from "@/lib/dashboard/admin";
import { clearSecret, rotateSecret } from "../actions/secrets";
import { RotateSecretForm } from "./rotate-secret-form";

export function SecretRow({ secret }: { readonly secret: ManagedSecret }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleClear() {
    setError(null);
    const confirmed = await confirm({
      title: `Mark ${secret.key} as not set?`,
      description: "Destroys any encrypted copy held for it. Use this once the credential is revoked at the provider.",
      confirmLabel: "Clear secret",
      tone: "destructive",
    });
    if (!confirmed) return;

    startTransition(() => {
      void clearSecret({ key: secret.key }).then((result) => {
        if (!result.ok) setError(result.error);
        else router.refresh();
      });
    });
  }

  async function handleRotate(value: string, storeValue: boolean) {
    setError(null);
    const confirmed = await confirm({
      title: `Rotate ${secret.key}?`,
      description: "This is irreversible: the previous stored copy, if any, is discarded. The value still has to be set at the provider, and a Vercel or edge-function secret only takes effect after a redeploy.",
      confirmLabel: "Rotate secret",
      tone: "destructive",
    });
    if (!confirmed) return false;

    startTransition(() => {
      void rotateSecret({ key: secret.key, value, storeValue }).then((result) => {
        if (!result.ok) setError(result.error);
        else {
          setRotating(false);
          router.refresh();
        }
      });
    });
    return true;
  }

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs text-ink">{secret.key}</p>
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                secret.isSet ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              }`}
            >
              {secret.isSet ? "set" : "not set"}
            </span>
            <span className="shrink-0 rounded-full bg-cloud px-1.5 py-0.5 text-[10px] text-ink-soft">
              {secret.location}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-ink-soft">{secret.description}</p>
          <p className="mt-0.5 text-[11px] text-ink-soft">
            Used by {secret.expectedBy}
            {secret.lastFour ? ` · ends ${secret.lastFour}` : ""}
            {secret.rotatedAt
              ? ` · rotated ${new Date(secret.rotatedAt).toLocaleDateString()} by ${secret.rotatedByEmail ?? "unknown"}`
              : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setRotating((v) => !v)}>
            {rotating ? "Cancel" : "Rotate"}
          </Button>
          {secret.isSet && (
            <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={() => void handleClear()}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {rotating && (
        <div className="mt-3">
          <RotateSecretForm pending={pending} onSubmit={handleRotate} />
        </div>
      )}
      {dialog}
    </li>
  );
}
