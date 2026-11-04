"use client";

import { type ReactNode } from "react";

import { Button } from "@/components/ui/button";

import { resolveAlert } from "../actions";
import { useAdminAction } from "../use-admin-action";

export function ResolveAlertButton({ id }: { readonly id: string }): ReactNode {
  const { pending, error, run } = useAdminAction();
  return (
    <>
      <Button variant="outline" disabled={pending} onClick={() => run(() => resolveAlert(id))}>
        Resolve
      </Button>
      {error ? <span role="alert" className="text-sm text-destructive">{error}</span> : null}
    </>
  );
}
