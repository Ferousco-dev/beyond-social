import { PanelLeft } from "lucide-react";
import { type ReactNode } from "react";

import { type AdminIdentity } from "../types";

import { AccountFooter } from "./account-footer";
import { ConsoleNav } from "./console-nav";
import { ConsoleWordmark } from "./console-wordmark";

export function ConsoleSidebar({
  admin,
  onNavigate,
  onCollapse,
}: {
  admin: AdminIdentity | null;
  onNavigate?: () => void;
  onCollapse?: () => void;
}): ReactNode {
  return (
    <div className="flex h-full flex-col bg-paper">
      <div className="flex items-center justify-between px-3 py-3">
        <ConsoleWordmark />
        {onCollapse ? (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse sidebar"
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cloud hover:text-ink"
          >
            <PanelLeft className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-2">
        <ConsoleNav onNavigate={onNavigate} />
      </div>

      <AccountFooter admin={admin} />
    </div>
  );
}
