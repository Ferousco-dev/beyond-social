---
id: settings-and-account-pages-profile-vs-account-distinction
title: Separating public profile fields from private account fields
category: layout
subcategory: information-architecture
tags: [settings, profile, privacy, information-architecture]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Public-facing profile fields (what other members see) and private account
fields (how the system identifies and bills the user) need visibly distinct
treatment even when both sit inside the same rail group.

The recipe:

- Profile fields — display name, avatar, bio, public links — get a live
  preview rendered as the actual public-facing card next to the form, so the
  user sees exactly what changes before saving.
- Account fields — legal name, billing email, phone, timezone — get no
  public preview, because nothing in this group is shown to other users.
- State the visibility boundary in copy, not just layout: "Visible to other
  members" directly under the Profile heading, so no field's audience is
  assumed.
- Keep avatar upload in Profile, not Account, even when both fields live in
  the same backend `users` row — grouping follows who sees it, not how it's
  stored.

Why: users routinely conflate "what I typed into a form" with "what a
stranger can see," and getting this wrong has real consequences — someone
assuming their account email is private when it's actually rendered as their
public handle is a privacy incident, not a cosmetic bug. An explicit boundary
plus a live preview closes the gap between what a field does and what a user
assumes it does.

Example: editing "Display name" updates a small public profile card shown
beside the input in real time; editing "Timezone" a few rows below shows no
such preview, because timezone only affects the user's own view.
Counter-example: one flat form listing legal name, display name, avatar, and
phone number in database column order with no preview and no visibility
labels — the user has to guess which fields strangers will ever see.
