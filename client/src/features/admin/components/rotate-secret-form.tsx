"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RotateSecretForm({
  pending,
  onSubmit,
}: {
  readonly pending: boolean;
  readonly onSubmit: (value: string, storeValue: boolean) => Promise<boolean>;
}) {
  const [value, setValue] = useState("");
  const [storeValue, setStoreValue] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const submitted = await onSubmit(value, storeValue);
    if (submitted) setValue("");
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <Label htmlFor="secret-value">New value</Label>
        <Input
          id="secret-value"
          type="password"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          minLength={12}
          placeholder="At least 12 characters"
          required
        />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-xs text-ink-soft">
        <input
          type="checkbox"
          checked={storeValue}
          onChange={(event) => setStoreValue(event.target.checked)}
          className="size-4 rounded border-input"
        />
        Keep an encrypted copy in Vault
      </label>
      <Button type="submit" size="sm" disabled={pending || value.length < 12}>
        {pending ? "Rotating…" : "Confirm rotation"}
      </Button>
    </form>
  );
}
