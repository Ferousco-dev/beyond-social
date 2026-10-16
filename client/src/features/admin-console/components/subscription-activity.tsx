import { type ReactNode } from "react";

import type { BillingActivity } from "@/lib/go-api/admin-schemas";

function eventLabel(type: string): string {
  switch (type) {
    case "started": return "Started";
    case "status_changed": return "Status changed";
    case "renewed": return "Renewed";
    case "invoice_paid": return "Invoice paid";
    case "invoice_payment_failed": return "Payment failed";
    default: return type.replaceAll("_", " ");
  }
}

function amount(value: number, currency: string): string {
  if (!currency) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(value / 100);
}

export function SubscriptionActivity({ events }: { readonly events: readonly BillingActivity[] }): ReactNode {
  return (
    <section className="mt-8" aria-labelledby="subscription-activity-heading">
      <h2 id="subscription-activity-heading" className="text-sm font-semibold text-ink">Subscription activity</h2>
      <p className="mt-1 text-xs text-ink-soft">Latest persisted lifecycle and invoice events. Older history is not backfilled.</p>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">No subscription activity recorded yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-hairline border-y border-hairline">
          {events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 py-3 text-sm">
              <span className="min-w-0 flex-1">
                <span className="font-medium text-ink">{eventLabel(event.event_type)}</span>
                <span className="ml-2 text-ink-soft">{event.email}</span>
              </span>
              <span className="capitalize text-ink-soft">{event.status}</span>
              {event.amount_cents > 0 ? <span className="tabular-nums text-ink">{amount(event.amount_cents, event.currency)}</span> : null}
              {event.attempt_count > 0 ? <span className="text-xs text-ink-soft">Attempt {event.attempt_count}</span> : null}
              <time className="w-full text-right text-xs text-ink-soft sm:w-auto" dateTime={event.occurred_at}>
                {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.occurred_at))}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
