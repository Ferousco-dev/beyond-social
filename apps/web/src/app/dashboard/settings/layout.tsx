import { type ReactNode } from "react";

import { SettingsTabs } from "@/features/settings/components/settings-tabs";

/** Shared frame for every settings section. */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Settings</h1>
      <div className="mt-6">
        <SettingsTabs />
      </div>
      {children}
    </div>
  );
}
