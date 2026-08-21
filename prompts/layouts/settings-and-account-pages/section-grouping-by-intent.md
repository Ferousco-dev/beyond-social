---
id: settings-and-account-pages-section-grouping-by-intent
title: Grouping settings by user intent, not by schema
category: layout
subcategory: information-architecture
tags: [settings, information-architecture, grouping, ux]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Settings sections should be grouped by the real-world question a field
answers, not by which database table or backend service happens to store it.

The recipe:

- Group by intent: "How do I sign in" (password, MFA, sessions), "What can
  others see" (privacy, profile visibility), "How do you bill me" (plan,
  payment method, invoices) — never by internal schema or team ownership.
- Cap a panel at roughly 5-9 fields visible without scrolling; past that,
  split into labeled sub-sections inside the same rail item rather than
  spawning a new rail entry for every few fields.
- Order sections by frequency of visit, not alphabetically: Profile and
  Notifications get opened often and belong near the top; Danger Zone is
  visited almost never and belongs last.
- Keep each field in exactly one place. If email is needed for both login and
  notification delivery, treat it as one canonical field with a link from the
  second context, never a duplicate input that can drift out of sync.

Why: the database schema reflects how engineers built the feature over time;
it rarely matches how a user reasons about their own account. A user thinking
"I want to stop getting texted" doesn't know or care which table stores SMS
preference — grouping by their question, verified with a quick card sort
against real users, is what actually makes the setting findable.

Example: a "Sign-in & security" section containing password, MFA methods, and
active sessions together, even though they may live in three different
backend tables.
Counter-example: separate top-level rail items for "Password," "Two-factor,"
and "Devices" that were each built as a distinct engineering ticket — three
clicks to answer one question ("is my account secure") that should take one.
