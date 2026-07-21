"use client";

import { Switch } from "@/components/ui/switch";

import { useNotificationPrefs, type NotificationKey } from "../hooks/use-notification-prefs";

interface Row {
  readonly key: NotificationKey;
  readonly label: string;
  readonly hint: string;
}

const GROUPS: ReadonlyArray<{ heading: string; rows: readonly Row[] }> = [
  {
    heading: "Your videos",
    rows: [
      {
        key: "draftReady",
        label: "Draft ready",
        hint: "When a video finishes generating and is ready to edit",
      },
      {
        key: "postPublished",
        label: "Post published",
        hint: "When a scheduled post goes live on a platform",
      },
      {
        key: "publishFailed",
        label: "Publish failed",
        hint: "When a platform rejects a post and it needs attention",
      },
    ],
  },
  {
    heading: "Account",
    rows: [
      {
        key: "creditsLow",
        label: "Credits running low",
        hint: "When fewer than a quarter of your monthly credits remain",
      },
      {
        key: "weeklySummary",
        label: "Weekly summary",
        hint: "A Monday digest of reach and scheduled posts",
      },
      { key: "productNews", label: "Product news", hint: "Occasional updates about new features" },
    ],
  },
];

export function NotificationsPanel() {
  const { prefs, toggle, ready } = useNotificationPrefs();

  return (
    <div className="space-y-7">
      {GROUPS.map((group) => (
        <section key={group.heading}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {group.heading}
          </h3>
          <ul className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline">
            {group.rows.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-4 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-ink">{row.label}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">{row.hint}</p>
                </div>
                <Switch
                  checked={prefs[row.key]}
                  onChange={() => toggle(row.key)}
                  label={row.label}
                  disabled={!ready}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="text-xs text-ink-soft">
        Preferences are saved on this device. They will move to your account once email delivery is
        connected.
      </p>
    </div>
  );
}
