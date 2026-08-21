---
id: screen-reader-and-aria-patterns-accessible-name-computation
title: How the accessible name is computed
category: accessibility
subcategory: screen-reader-and-aria-patterns
tags: [aria, accessible-name, labelling, screen-reader]
applicability:
  platforms: [web]
  productTypes: [landing-page, saas-dashboard, marketing-site, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Every interactive element exposes one string to a screen reader, its accessible
name, and the browser computes it by checking a fixed precedence order, not by
"whichever label looks right in the DOM."

- Order (highest wins): `aria-labelledby` > `aria-label` > associated
  `<label>` (for form fields) > visible text content (for buttons/links) >
  `title` attribute (last resort, also shown as a tooltip).
- `aria-labelledby` concatenates the text content of every referenced id, in the
  order listed, ignoring their own visibility (even `display:none` text is read).
- `aria-label` overrides visible text entirely; a sighted user reading "Delete"
  on a button whose `aria-label="Remove item 4 from cart"` will hear a different
  string than they see, which is intentional here but a trap if done carelessly.
- Never apply `aria-label` to a native element that already has a correct visible
  label; you will silently create a mismatch between visual and spoken content.
- Check computed names with the browser's Accessibility Inspector, not by reading
  the markup and assuming.

Why: screen reader users act on the accessible name alone. If it is missing,
generic ("button"), or contradicts the visible label, the element becomes
unusable or actively misleading, regardless of how correct the visual design is.

Example: `<button aria-label="Close dialog"><svg aria-hidden="true">...</svg></button>`
for an icon-only close button.
Counter-example: an icon button with no text and no `aria-label` — a screen
reader announces just "button," giving no clue what it does.
