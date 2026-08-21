---
id: cards-and-lists-grouped-section-headers
title: Grouping long lists by how users search, not how they sort
category: component
subcategory: cards-and-lists
tags: [grouping, section-headers, navigation, wayfinding]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Group long lists under sticky section headers chosen from how the user would describe looking for this list again — not from whichever database column happens to sort cleanly.

- Pick the grouping key from the user's actual mental model: date buckets ("Today / Yesterday / This week / Older") for activity feeds, status groups for task lists, alphabetical only for named, browseable catalogs.
- Make headers sticky on scroll so the current group stays legible as context, but keep them lightweight — a label only, no embedded actions — so they don't eat viewport height a scrolling user needs.
- Show a count per header when it aids triage ("Failed (3)"), but drop counts from high-churn groups where the number is stale the instant it renders.
- Cap groups at roughly 5-7 per screen; past that, grouping stops helping navigation and becomes its own list to scan — reach for a filter or tab instead of finer-grained grouping.
- Hide empty groups entirely rather than showing a header with a "None" placeholder underneath — an empty group still costs the user a scan cycle for zero information.

Why: grouping is a wayfinding tool, not a decoration, and it only earns its vertical space if the buckets answer the question the user is actually holding when they open this list — "what happened today," "what needs my attention." That means the grouping key should be chosen by interviewing that question directly, not by defaulting to whatever field the backend already sorts by.

Example: "activity list grouped by Today / Yesterday / This week / Older, sticky header, groups hidden entirely when empty."
Counter-example: a list grouped by internal record-creation-method (API vs UI vs import) — a taxonomy meaningful to engineering, meaningless to the user trying to find yesterday's upload.
