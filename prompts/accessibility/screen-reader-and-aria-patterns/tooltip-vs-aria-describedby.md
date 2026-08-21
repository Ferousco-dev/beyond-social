---
id: screen-reader-and-aria-patterns-tooltip-vs-aria-describedby
title: Tooltips and aria-describedby vs aria-labelledby
category: accessibility
subcategory: screen-reader-and-aria-patterns
tags: [aria, tooltip, aria-describedby, hover]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

A tooltip supplies supplementary description, not the control's name, so it
belongs on `aria-describedby`, and the whole pattern only matters if it's also
reachable without a mouse.

- The triggering element (usually an icon button or a form field) has
  `aria-describedby` pointing at the tooltip's id; the tooltip text itself gets
  `role="tooltip"`.
- Never use `aria-labelledby` for a tooltip on an element that already has a
  name — that replaces the accessible name instead of adding to it, so a screen
  reader announces only the tooltip text and drops the control's actual label.
- A tooltip must appear on keyboard focus, not only mouse hover — if it only
  fires on `:hover`, keyboard-only and screen reader users (who navigate by
  focus) never see or hear it at all.
- Content in a tooltip should be genuinely supplementary (a unit clarification,
  an abbreviation expansion, extra context) — anything required to operate the
  control belongs in the visible label or `aria-describedby`'d help text that
  doesn't disappear, not in a hover-only tooltip that a screen reader user has
  to specifically discover exists.
- Escape should dismiss an open tooltip without moving focus away from the
  trigger, matching the native browser `title` attribute's own dismiss
  behavior that users already expect.
- For rich interactive content inside the popup (a link, a button), that's no
  longer a tooltip — it's a popover, and needs its own dialog-adjacent focus
  handling instead of `role="tooltip"`, which assistive tech treats as
  non-interactive description text.

Why: `aria-describedby` appends to what's already announced as the name,
preserving both; conflating description with naming either duplicates or
silently erases the control's actual identity depending on which attribute is
misused.

Example: `<button aria-describedby="tt-export">Export</button><span role="tooltip" id="tt-export">Downloads a CSV of the current filtered view</span>`.
Counter-example: `aria-labelledby` pointing a labeled "Export" button at hover-only
tooltip text, so focus-only users hear no label at all.
