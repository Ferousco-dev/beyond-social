"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

import { clearChecklistDismissal } from "../hooks/use-checklist-state";

/**
 * Brings the getting-started checklist back after it has been closed.
 *
 * A full page navigation, not a router push: the checklist lives in the
 * dashboard layout, which stays mounted across in-app routes, so only a fresh
 * load re-reads the "dismissed" preference this button clears.
 */
export function ReplayChecklistButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        clearChecklistDismissal();
        window.location.href = "/dashboard";
      }}
    >
      <RotateCcw aria-hidden />
      Show the getting-started checklist again
    </Button>
  );
}
