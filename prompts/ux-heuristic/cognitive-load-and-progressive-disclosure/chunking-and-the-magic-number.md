---
id: cognitive-load-and-progressive-disclosure-chunking-and-the-magic-number
title: Chunking options into working-memory-sized groups
category: ux-heuristic
subcategory: progressive-disclosure
tags: [chunking, cognitive-load, working-memory, information-architecture]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Working memory reliably holds about four chunks of new information at once, so
any list, menu, or option set longer than that needs internal grouping before
it needs disclosure — chunking and hiding are different tools for the same
problem and most screens need both.

The recipe:

- Group related options under a labeled subheading the moment a flat list
  passes about seven items — style options, then format options, then delivery
  options, rather than one undifferentiated list of twenty.
- Make each group's label do real work: a user should be able to skip an
  entire group by reading its heading alone, without reading its members.
- Order groups by decision sequence, not alphabetically — the choice a user
  must make first (what to create) precedes the choice they make last (how to
  deliver it).
- Within a group, cap visible members at five to seven; if a group itself grows
  past that, it needs its own sub-grouping or its own disclosure trigger.
- Reuse the same grouping taxonomy across every screen in the product — a user
  who learns "Style / Format / Delivery" on one screen should find the same
  three buckets on the next, not a different arbitrary split.

Why: chunking doesn't reduce the total information on screen, it reduces how
many independent things the user's working memory has to track simultaneously.
Seven random items exceed working memory; seven items sorted into three labeled
groups collapse to three trackable units, each expandable on demand.

Example: a style picker split into "Look" (3 options), "Pacing" (3 options),
and "Voice" (3 options) instead of nine unlabeled thumbnails in a single row.

Counter-example: a single scrolling grid of twenty-two style thumbnails with no
group labels — the user has no way to skip a category they already know they
don't want without visually inspecting every tile in it.
