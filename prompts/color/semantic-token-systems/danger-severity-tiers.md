---
id: semantic-token-systems-danger-severity-tiers
title: Split danger into severity tiers instead of one flat red
category: color-system
subcategory: token-architecture
tags: [danger, severity, semantic-color, tokens]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

A single "danger" token conflates three different situations that deserve
different visual weight: a routine validation error, a destructive but
recoverable action, and an irreversible or account-level critical action.

- Validation tier: lower-saturation red or even a neutral-red border on a
  form field, this happens constantly and should not visually shout.
- Destructive tier: standard danger red on the button itself, used for
  actions with an undo path or a confirmation step, e.g. archiving or
  removing a single item.
- Critical tier: a distinct, more saturated or darker red reserved only for
  irreversible, account-wide, or data-loss actions (deleting an org,
  revoking all sessions), often paired with a required typed confirmation.
- Do not create more than three tiers, additional gradation stops being
  perceptible and just adds token-map complexity without a corresponding user
  benefit.

Why: if every error, from a mistyped email field to a permanent account
deletion, uses the identical red at the identical saturation, users
calibrate to the most frequent case, the mundane validation error, and that
calibration carries into the rare critical moment where the same visual
weight fails to convey the actual stakes. Severity tiers let color intensity
do part of the work that a confirmation dialog otherwise has to do alone.

Example: a required-field border in muted `#F1B4B4`, an "Archive project"
button in standard `#DC2626`, and a "Delete organization" button in a darker,
higher-saturation `#991B1B` with a typed-confirmation modal.
Counter-example: the same `#DC2626` applied identically to a form field
border, an archive button, and an account-deletion button, so nothing in the
color signals that one of these three actions cannot be undone.
