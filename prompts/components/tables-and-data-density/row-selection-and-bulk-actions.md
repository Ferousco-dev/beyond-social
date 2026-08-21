---
id: tables-and-data-density-row-selection-and-bulk-actions
title: Row selection and the contextual bulk action bar
category: component
subcategory: tables-and-data-density
tags: [tables, selection, bulk-actions, checkbox]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Selecting rows for a bulk operation needs a dedicated checkbox column and a
toolbar that swaps to show only the actions valid for the current selection,
rather than reusing the default toolbar with buttons disabled.

- Pin a checkbox column as the leftmost column (before any frozen label column),
  fixed-width, identical across every row.
- Give the header checkbox three states: unchecked (none selected), checked (all
  visible rows selected), and indeterminate/dash (some but not all) — a plain
  checkbox that silently jumps between only two states misrepresents partial
  selection.
- On selecting one or more rows, replace the default toolbar (search, filters,
  density toggle) with a contextual bar showing the selection count ("14
  selected") and only the actions that apply to that selection, plus a "Clear
  selection" control.
- Highlight selected rows with a distinct background (typically a tinted brand
  color at low opacity) independent of hover and zebra states, so a selected row
  stays visually marked even when the pointer moves elsewhere.
- Decide explicitly whether "select all" means "select all visible rows on this
  page" or "select all N rows matching the current filter across every page," and
  surface that distinction in the UI when N exceeds the page size — silently
  picking one is a common source of destructive bulk-action mistakes.

Why: a disabled-button toolbar still shows actions that don't apply, forcing the
user to scan and discard irrelevant options; a contextual bar that only shows
what's actually possible on the current selection removes that scanning step and
makes the selection count itself the toolbar's headline.

Example: selecting 3 of 40 rows swaps the toolbar to "3 selected · Archive ·
Export · Delete · Clear selection," header checkbox shows indeterminate state.

Counter-example: leaving the normal search-and-filter toolbar in place with
bulk-action buttons grayed out until 1+ rows are selected — the user has to parse
which of a dozen visible controls are currently inert before finding the ones
that matter.
