---
id: forms-and-inputs-character-count-and-length-limits
title: Character counters and length limits
category: component
subcategory: forms-and-inputs
tags: [forms, character-count, limits, feedback]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site, onboarding, short-form-video]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

A hard character limit with no visible counter forces the user to discover the
ceiling by hitting it mid-sentence, which reads as the field cutting them off
rather than the field having a known boundary.

The recipe:

- Show a live counter ("120/280") only on fields where the limit is tight
  enough to realistically be hit — a bio, a social caption, a tweet-length
  field — not on a field like "Last name" with a generous, effectively
  irrelevant max length.
- Keep the counter hidden or muted until the user is within roughly 20% of the
  limit, then shift it to a warning color, so it isn't competing for attention
  during normal typing.
- Never silently truncate what the user typed past the limit; either block
  further input at the limit with the counter pinned at zero-remaining, or
  allow overtyping and show a negative remaining count with a clear error
  state on submit.
- State the limit's unit explicitly when it isn't characters (e.g. "3 of 5
  images," "under 60 seconds") since a generic counter without units leaves
  the boundary ambiguous.
- For fields limited for a real downstream reason (a caption truncated by a
  platform, a subject line cut off in an inbox), explain why in the helper
  text, not just enforce the number silently.

Why: a limit the user can see coming is a constraint they can plan around
while writing; a limit that appears only as an abrupt stop mid-keystroke reads
as a malfunction, and the difference in how it's authored costs nothing beyond
rendering a number that was already known at design time.

Example: a bio field capped at 160 characters shows "142/160" in muted gray,
switching to amber past 128, with input blocked at 160 rather than truncated.

Counter-example: a caption field that accepts unlimited typing, then silently
chops the text to 100 characters on save with no counter and no warning,
discarding whatever the user wrote past that point.
