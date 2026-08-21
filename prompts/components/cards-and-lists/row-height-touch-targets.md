---
id: cards-and-lists-row-height-touch-targets
title: Separating visual row height from tap target size
category: component
subcategory: cards-and-lists
tags: [touch-targets, accessibility, mobile, row-height]
applicability:
  platforms: [mobile, ios, android]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Row height and tap target size are governed by different constraints and must be designed as two separate boxes — a visually compact row and an undersized hit area are not the same thing, and only one of them is allowed to shrink freely.

- Keep the minimum touch target at roughly 44x44pt (iOS) or 48x48dp (Material) regardless of how tight the visual row looks — extend invisible padding beyond the drawn row border if the design calls for a tighter visual.
- Desktop pointer targets can go tighter (around 32px) since mouse precision is higher, but keep interactive elements — checkboxes, action buttons — at least 24px with 8px of spacing from neighbors to avoid mis-clicks.
- When a row has multiple interactive elements (checkbox, thumbnail-as-link, kebab menu), check that their hit boxes don't overlap even if their visuals don't — a fat-finger tap on one shouldn't clip into another's target.
- Make the entire row one tap target for the primary action rather than requiring a precise tap on the title text; expand the clickable area to the row's full bounds.
- Give swipe actions a minimum commit threshold (roughly 30% of row width) with a visual reveal during the drag, so an accidental swipe doesn't fire a destructive action before the user sees it building.

Why: Fitts's law predicts that time-to-hit and error rate both rise as target size shrinks, and this shows up as mis-taps a visual density audit won't catch, since the audit looks at the drawn row, not the hit area behind it. Separating the two boxes lets a row stay as dense as the design wants while the tap target never drops below the platform floor.

Example: "row drawn at 40px visual height, padding extends the tap target to 48px, and the full row is one tap zone."
Counter-example: a dense mobile list where the checkbox, a 24px thumbnail-link, and a kebab menu sit 4px apart with no padding — users routinely open the wrong item or trigger the wrong action.
