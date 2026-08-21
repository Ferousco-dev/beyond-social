---
id: search-and-filter-patterns-mobile-filter-sheet-apply-button
title: The sticky Apply footer in a mobile filter sheet
category: layout
subcategory: search-and-filter
tags: [mobile, filters, bottom-sheet, apply-button]
applicability:
  platforms: [mobile, web]
  productTypes: [e-commerce, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

A mobile filter overlay holds selections in a draft state until the user
commits — applying each tap live to a grid the user can't see behind the sheet
gives no feedback and risks a jarring reflow the instant the sheet closes.

- Filters selected inside the sheet stay local (uncommitted) until the user
  taps Apply; nothing changes in the underlying result grid until then.
- Pin an Apply button to the bottom of the sheet, always visible above the
  keyboard or home indicator, never requiring a scroll to reach.
- Update the Apply button's own label with the live count as selections
  change inside the sheet: "Show 47 results," recalculated on every toggle.
- Include a "Reset" or "Clear" action in the sheet's header, separate from
  Apply, so a user can discard their in-progress selections without closing
  and reopening the sheet.
- Closing the sheet by swiping down or tapping the scrim should discard
  uncommitted changes, matching the same behavior as a Cancel action.

Why: on a small screen the filter UI and the results it affects can't be seen
together, so the Apply button's live count is the only feedback loop the user
has before committing — it turns an opaque set of toggles into a previewed
decision, and it avoids the disorienting jump of a grid re-rendering mid-swipe
as the sheet closes.

Example: sheet footer reading "Show 47 results" in a full-width button that
updates from "Show 128 results" as each filter is toggled inside the sheet.
Counter-example: each toggle inside the sheet applying instantly to the hidden
grid behind it, so closing the sheet reveals an already-changed page with no
preview of what the selections were about to do.
