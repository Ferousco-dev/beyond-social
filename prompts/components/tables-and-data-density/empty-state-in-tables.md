---
id: tables-and-data-density-empty-state-in-tables
title: Zero-row empty state within a data table
category: component
subcategory: tables-and-data-density
tags: [tables, empty-state, onboarding]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A table with zero rows is not a blank rectangle; it is a state that has to
explain why it's empty and what to do next, rendered inside the same frame the
data would otherwise occupy.

- Keep the header row, toolbar, and column headers visible even at zero rows —
  removing them on empty state makes the page feel broken rather than simply
  unpopulated.
- Distinguish "no data has ever existed" from "filters/search matched nothing":
  the first needs a create action ("Add your first project"); the second needs a
  "Clear filters" action and a restatement of what was searched for.
- Center a small icon or illustration, a one-line explanation, and a single
  primary button inside the table body area — not a wall of text, and not more
  than one call to action.
- Match the empty state's vertical space to roughly 3-5 rows' worth of height so
  the page doesn't collapse to a sliver or leave excessive dead whitespace below
  it.
- Never show a loading spinner as a substitute for a true empty state; once data
  has finished loading and the result is zero rows, spinner and empty state are
  different states and must render differently.

Why: an unexplained blank table reads as an error to most users, who will reload
the page or assume something broke, rather than a signal to add data; naming the
cause and giving one clear next action converts a dead end into the correct next
step.

Example: zero-row "Team Members" table showing a person-outline icon, "No team
members yet," and a single "Invite a teammate" button, header row still visible
above it.

Counter-example: a filtered table that returns zero matches but silently renders
"No data" with no mention of the active filters and no way to clear them — the
user can't tell if the feature is broken or their filter was simply too narrow.
