"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { saveEmailFrom } from "../actions";
import { useAdminAction } from "../use-admin-action";

/** Where the product's emails say they come from. Needs a domain verified with Resend. */
export function EmailFromForm({ current, fallback }: { readonly current: string; readonly fallback: string }): ReactNode {
  const [from, setFrom] = useState(current);
  const { pending, error, run } = useAdminAction();

  return (
    <div className="mt-8 rounded-xl border border-hairline bg-paper p-4">
      <h2 className="text-sm font-semibold text-ink">Email sender</h2>
      <p className="mt-1 text-xs text-ink-soft">
        Receipts and billing emails are sent from this address, for example Beyond Social &lt;hello@yourdomain.com&gt;. The domain must be verified in Resend. Until you set one, emails use {fallback}, which only reaches the Resend account owner.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="min-w-64 flex-1 text-xs text-ink-soft">
          From
          <Input className="mt-1" value={from} onChange={(e) => setFrom(e.target.value)} placeholder={fallback} />
        </label>
        <Button disabled={pending || !from.includes("@") || from.trim() === current} onClick={() => run(() => saveEmailFrom(from))}>
          Save
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
