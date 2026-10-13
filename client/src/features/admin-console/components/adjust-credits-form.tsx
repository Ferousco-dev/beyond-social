"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { adjustUserCredits } from "../actions";
import { useAdminAction } from "../use-admin-action";

export function AdjustCreditsForm({ userId }: { readonly userId: string }): ReactNode {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const { pending, error, run } = useAdminAction();

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    run(
      () => adjustUserCredits(userId, Number(amount), reason),
      () => {
        setAmount("");
        setReason("");
      },
    );
  };

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
      <Input
        inputMode="numeric"
        aria-label="Credits to add (negative to take back)"
        placeholder="+50 or -20"
        className="sm:w-32"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
      />
      <Input aria-label="Reason" placeholder="Reason" value={reason} onChange={(event) => setReason(event.target.value)} />
      <Button type="submit" disabled={pending || amount === "" || reason.trim() === ""}>
        Apply
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
