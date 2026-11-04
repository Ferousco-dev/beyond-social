import { type Metadata } from "next";

import { ThemePicker } from "@/features/settings/components/theme-picker";
import { getTheme } from "@/lib/theme-server";

export const metadata: Metadata = { title: "Appearance" };

export default async function AppearancePage() {
  const theme = await getTheme();

  return (
    <section className="mt-6 lg:mt-8">
      <ThemePicker current={theme} />
    </section>
  );
}
