import { type ReactNode } from "react";

import { SettingsBack } from "@/features/settings/components/settings-back";
import { SettingsRail } from "@/features/settings/components/settings-rail";

/**
 * Shared frame for every settings section.
 *
 * Two shapes from one tree. On a desktop it is the usual settings surface: a
 * section rail on the left, the section on the right. On a phone the rail is
 * gone and each section is a full screen reached from a list, with a back arrow,
 * which is how settings behaves in an app.
 *
 * These stayed real routes rather than becoming a dialog. Connecting a social
 * account leaves for an OAuth round trip and comes back to a URL, and a dialog
 * has no URL to come back to.
 */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
      {/* On a phone the title belongs to the list screen, which renders its own.
          Here it titles the frame, where the rail is always in view. */}
      <h1 className="hidden text-2xl font-semibold tracking-tight text-ink lg:block">Settings</h1>

      <div className="lg:mt-8 lg:flex lg:gap-10">
        <SettingsRail />
        <div className="min-w-0 flex-1">
          <SettingsBack />
          {children}
        </div>
      </div>
    </div>
  );
}
