"use client";

import { useState } from "react";

import { type WebhookEvent, type WebhookSummary } from "@/lib/webhooks/types";

import { createWebhook, deleteWebhook, rotateWebhookSecret, setWebhookActive } from "../actions";
import { SecretReveal } from "./secret-reveal";
import { WebhookForm } from "./webhook-form";
import { WebhookList } from "./webhook-list";

interface FreshSecret {
  value: string;
  rotated: boolean;
}

/**
 * Owns the one piece of state that cannot live on the server: the plaintext
 * secret, which exists only in this component's memory between the action
 * returning it and the user dismissing the banner. It is never written anywhere
 * and a refresh loses it, which is the intended behaviour.
 */
export function WebhookManager({ webhooks }: { webhooks: readonly WebhookSummary[] }) {
  const [fresh, setFresh] = useState<FreshSecret | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (input: { url: string; events: WebhookEvent[] }) => {
    const result = await createWebhook(input);
    if (result.status === "error") return result;
    return { status: "ok" as const, secret: result.secret };
  };

  return (
    <div className="space-y-4">
      {fresh ? (
        <SecretReveal
          secret={fresh.value}
          rotated={fresh.rotated}
          onDismiss={() => setFresh(null)}
        />
      ) : null}

      <WebhookForm
        submit={submit}
        onCreated={(secret) => {
          setError(null);
          setFresh({ value: secret, rotated: false });
        }}
      />

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <WebhookList
        webhooks={webhooks}
        onRotate={async (id) => {
          const result = await rotateWebhookSecret(id);
          if (result.status === "ok") {
            setError(null);
            setFresh({ value: result.secret, rotated: true });
          } else {
            setError(result.message);
          }
        }}
        onToggle={async (id, isActive) => {
          const result = await setWebhookActive(id, isActive);
          setError(result.status === "error" ? result.message : null);
        }}
        onDelete={async (id) => {
          const result = await deleteWebhook(id);
          setError(result.status === "error" ? result.message : null);
        }}
      />
    </div>
  );
}
