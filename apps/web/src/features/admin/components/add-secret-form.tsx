"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSecret } from "../actions/secrets";

const LOCATIONS = [
  { value: "vercel", label: "Vercel (web)" },
  { value: "supabase", label: "Supabase (edge functions)" },
  { value: "host", label: "Other host" },
] as const;

/**
 * Registers a secret the console did not already know about.
 *
 * A value is optional: this can name a credential the app now needs before
 * anyone has typed it in, so it shows up "not set" the same as any other
 * gap, rather than staying invisible until someone remembers to add a
 * migration for it. Collapsed behind a button rather than always open,
 * matching the rest of this list, where every other row's edit surface is a
 * reveal too.
 */
export function AddSecretForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [expectedBy, setExpectedBy] = useState("");
  const [location, setLocation] = useState<(typeof LOCATIONS)[number]["value"]>("vercel");
  const [value, setValue] = useState("");
  const [storeValue, setStoreValue] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await registerSecret({
        key: key.toUpperCase(),
        description,
        expectedBy,
        location,
        value: value || undefined,
        storeValue,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setKey("");
      setDescription("");
      setExpectedBy("");
      setValue("");
      setStoreValue(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div className="p-3">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden />
          Add secret
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="secret-key">Name</Label>
          <Input
            id="secret-key"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="NEW_PROVIDER_API_KEY"
            className="font-mono uppercase"
            required
          />
        </div>
        <div>
          <Label htmlFor="secret-location">Where it&apos;s configured</Label>
          <select
            id="secret-location"
            value={location}
            onChange={(event) => setLocation(event.target.value as typeof location)}
            className="h-10 w-full rounded-lg border border-hairline bg-paper px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {LOCATIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="secret-description">What reads it, and what breaks without it</Label>
        <Input
          id="secret-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Video generation refuses every request without it."
          required
        />
      </div>
      <div>
        <Label htmlFor="secret-expected-by">Which service(s)</Label>
        <Input
          id="secret-expected-by"
          value={expectedBy}
          onChange={(event) => setExpectedBy(event.target.value)}
          placeholder="edge functions"
          required
        />
      </div>
      <div>
        <Label htmlFor="secret-value">Value (optional — can register the name first)</Label>
        <Input
          id="secret-value"
          type="password"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Leave blank to register as not set"
        />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-xs text-ink-soft">
        <input
          type="checkbox"
          checked={storeValue}
          disabled={!value}
          onChange={(event) => setStoreValue(event.target.checked)}
          className="size-4 rounded border-input"
        />
        Keep an encrypted copy in Vault
      </label>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending || !key || !description || !expectedBy}>
          {pending ? "Adding…" : "Add secret"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
