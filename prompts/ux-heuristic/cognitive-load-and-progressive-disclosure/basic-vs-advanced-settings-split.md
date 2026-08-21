---
id: cognitive-load-and-progressive-disclosure-basic-vs-advanced-settings-split
title: Splitting basic and advanced settings
category: ux-heuristic
subcategory: progressive-disclosure
tags: [progressive-disclosure, settings, cognitive-load, information-architecture]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Settings screens should be architected as two tiers from the start — basic and
advanced — not flattened into one alphabetized list that grows however history
happened to add items.

The recipe:

- Group by frequency of change, not by data model. A field an engineer added
  last sprint does not deserve equal billing with the three settings 90% of
  users touch.
- Put the advanced tier behind an explicit, labeled gate: "Advanced" as its own
  section or tab, never disguised as a scroll continuation of basic settings.
- Name the gate honestly. "Advanced" or "Developer settings" sets correct
  expectations; "More" is too vague to signal that risk or complexity increases
  past that point.
- Carry a plain-language one-line consequence next to any advanced control that
  can break something (rate limits, webhook secrets, API scopes) — the tier
  boundary is also a warning boundary.
- Keep the two tiers on the same page reachable by anchor or tab, not buried in
  a separate settings sub-app; users should never need a search bar to find
  "basic" settings.

Why: a flat settings list forces every user to develop a mental filter for what
matters to them, every single visit. A tiered split does that filtering once, at
design time, using real usage data instead of asking each user to redo it from
scratch under time pressure.

Example: "Account" tab shows name, email, plan; a separate "Advanced" tab holds
API keys, webhook URLs, and data export — gated behind one explicit tab click.

Counter-example: a single settings page with forty fields in alphabetical order,
mixing "display name" next to "SAML certificate fingerprint" — alphabetization is
not an information architecture, it's the absence of one.
