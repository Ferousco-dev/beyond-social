"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/ui/use-confirm";
import { setUserRole } from "../actions/users";
import { ActionCard } from "./action-card";

/**
 * Promotes or demotes an account. Higher stakes than suspension — this hands
 * out or takes away access to every admin function, including this one — so
 * every path through here is gated behind a destructive confirm and a
 * required reason. The database refuses the caller's own account and the
 * last remaining admin; the error surfaces here rather than being
 * pre-checked client-side, since the count can change between render and
 * submit.
 */
export function RoleForm({ userId, role }: { readonly userId: string; readonly role: string }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isAdmin = role === "admin";
  const nextRole = isAdmin ? "user" : "admin";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const confirmed = await confirm({
      title: isAdmin ? "Demote this account to user?" : "Promote this account to admin?",
      description: isAdmin
        ? "Removes access to every admin function in this console, including this page. The database refuses to demote yourself or the last remaining admin."
        : "Grants access to every admin function in this console: user data, credits, secrets, config, and this role control itself. Give this only to someone who should have all of it.",
      confirmLabel: isAdmin ? "Demote to user" : "Promote to admin",
      tone: "destructive",
    });
    if (!confirmed) return;

    startTransition(() => {
      void setUserRole({ userId, role: nextRole, reason }).then((result) => {
        if (!result.ok) setError(result.error);
        else router.refresh();
      });
    });
  }

  return (
    <ActionCard
      title="Role"
      description={isAdmin ? "This account is an admin." : "This account is a regular user."}
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
        <div>
          <Label htmlFor="role-reason">Reason</Label>
          <Input
            id="role-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="New hire, offboarding…"
            required
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" size="sm" variant="destructive" disabled={pending} className="w-full">
          {pending ? "Saving…" : isAdmin ? "Demote to user" : "Promote to admin"}
        </Button>
      </form>
      {dialog}
    </ActionCard>
  );
}
