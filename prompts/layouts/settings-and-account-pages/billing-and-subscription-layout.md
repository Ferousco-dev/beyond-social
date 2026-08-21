---
id: settings-and-account-pages-billing-and-subscription-layout
title: Fixed block order for billing and subscription settings
category: layout
subcategory: billing
tags: [settings, billing, subscription, saas]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Billing settings should follow the same fixed block order every time: current
plan, payment method, invoice history — in that sequence, never rearranged
per product area.

The recipe:

- Current plan block first: plan name, price, renewal date, and a single
  primary call to action ("Change plan" or "Upgrade") — never bury the
  renewal date in a tooltip or a secondary tab.
- Payment method as its own card: card brand icon, last 4 digits, expiry, and
  "Update" — never force a full card re-entry just to make an unrelated
  billing change, like switching plans.
- Invoice history as a reverse-chronological table (date, amount, status,
  downloadable PDF) with status conveyed by text plus color, never color
  alone, so it stays legible to colorblind users.
- Show usage-based charges (seats, API calls, overages) as a line-item
  breakdown directly above the total on the current invoice, not hidden on a
  separate usage page — hidden usage is the single most common cause of
  billing-surprise support tickets.

Why: billing is the highest-anxiety settings category outside security,
because it involves real money and users often arrive already suspicious of
a charge. A fixed, predictable order means a returning user never has to
relearn where the number they're worried about lives — they can go straight
to it every time, which lowers both anxiety and support load.

Example: "Pro plan — $29/mo, renews Sep 3" at the top, Visa •••• 4242 below
it, invoices table beneath that, each row's status shown as "Paid" in green
text with a checkmark icon, not a bare colored dot.
Counter-example: invoice history at the top because it was the most recently
built feature, with plan details collapsed under an accordion — a user who
opens billing to check why they were charged has to hunt for context that
should have been the first thing they saw.
