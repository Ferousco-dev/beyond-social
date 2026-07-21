"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Bell,
  CreditCard,
  Database,
  Settings,
  Shield,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { type DashboardUser } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils";

import { AccountPanel } from "./settings-account";
import { GeneralPanel } from "./settings-general";
import { NotificationsPanel } from "./settings-notifications";

interface Section {
  id: string;
  label: string;
  icon: LucideIcon;
}

const SECTIONS: readonly Section[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "data", label: "Data controls", icon: Database },
  { id: "account", label: "Account", icon: User },
];

export function SettingsDialog({ user, children }: { user: DashboardUser; children: ReactNode }) {
  const [active, setActive] = useState("general");
  const currentLabel = SECTIONS.find((section) => section.id === active)?.label ?? "General";

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex h-[560px] max-h-[85vh] w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-hairline bg-paper text-ink shadow-card focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <Dialog.Title className="sr-only">Settings</Dialog.Title>
          <Dialog.Description className="sr-only">
            Manage your workspace settings.
          </Dialog.Description>

          <div className="hidden w-56 shrink-0 flex-col border-r border-hairline p-2 sm:flex">
            <p className="px-2.5 py-2 text-sm font-semibold">Settings</p>
            <nav className="mt-1 flex flex-col gap-0.5">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActive(section.id)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    active === section.id
                      ? "bg-cloud text-ink"
                      : "text-ink-soft hover:bg-cloud hover:text-ink",
                  )}
                >
                  <section.icon className="size-4" />
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
              <h2 className="text-base font-semibold">{currentLabel}</h2>
              <Dialog.Close
                aria-label="Close settings"
                className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cloud hover:text-ink"
              >
                <X className="size-5" />
              </Dialog.Close>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {active === "general" ? <GeneralPanel /> : null}
              {active === "notifications" ? <NotificationsPanel /> : null}
              {active === "account" ? <AccountPanel user={user} /> : null}
              {active === "security" || active === "billing" || active === "data" ? (
                <Blocked id={active} label={currentLabel} />
              ) : null}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Says what each unbuilt section is waiting on, rather than "coming soon". */
const BLOCKED: Record<string, { title: string; reason: string }> = {
  security: {
    title: "Password and two-factor authentication",
    reason:
      "Sign-in is not connected to a live account service yet, so there is no password or device to manage here.",
  },
  billing: {
    title: "Plan, payment method and invoices",
    reason:
      "Checkout is not connected yet. Payment details will be handled by Stripe and never entered on this page.",
  },
  data: {
    title: "Export and delete your data",
    reason:
      "Your projects are not stored on a server yet, so there is nothing to export or erase beyond this browser.",
  },
};

function Blocked({ id, label }: { id: string; label: string }) {
  const detail = BLOCKED[id];

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium text-ink">{detail?.title ?? label}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-soft">
        {detail?.reason ?? "These controls are not available yet."}
      </p>
    </div>
  );
}
