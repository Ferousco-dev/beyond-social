import { type Metadata } from "next";

import { NotificationSettings } from "@/features/settings/components/notification-settings";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-ink">Notifications</h2>
      <p className="mt-1 text-sm text-ink-soft">How we let you know when something is done.</p>
      <div className="mt-6">
        <NotificationSettings />
      </div>
    </div>
  );
}
