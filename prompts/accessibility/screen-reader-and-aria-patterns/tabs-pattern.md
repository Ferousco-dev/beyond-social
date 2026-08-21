---
id: screen-reader-and-aria-patterns-tabs-pattern
title: The tabs pattern (tablist, tab, tabpanel)
category: accessibility
subcategory: screen-reader-and-aria-patterns
tags: [aria, tabs, tablist, tabpanel, keyboard-navigation]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Tabs have no native HTML element, so the whole relationship between the tab
strip and the content it swaps has to be declared explicitly in ARIA, three
roles working together.

- The tab strip container gets `role="tablist"` with an `aria-label` naming its
  purpose ("Report views").
- Each clickable tab gets `role="tab"`, `aria-selected="true"|"false"`, and
  `aria-controls` pointing at the id of the panel it reveals.
- Each content region gets `role="tabpanel"`, `aria-labelledby` pointing back at
  its tab's id, and `tabindex="0"` so keyboard users can scroll into panel
  content that has no other focusable element.
- Use roving tabindex on the tabs themselves (only the selected tab has
  `tabindex="0"`, the rest `-1`), with Arrow Left/Right moving selection and
  Home/End jumping to first/last — the same single-tab-stop model as a radio
  group.
- Decide activation timing deliberately: "automatic activation" switches the
  panel as soon as arrow focus lands on a tab (fast, but can feel jumpy for
  panels with heavy content); "manual activation" requires Enter/Space to
  switch, announced by omitting auto-select — use manual for tabs whose panels
  are expensive to render or read.

Why: without `aria-controls`/`aria-labelledby` wiring, a screen reader announces
"tab, 2 of 4" but never associates it with what appeared, forcing a linear
re-read of the whole panel to find the connection.

Example: `<button role="tab" aria-selected="true" aria-controls="panel-usage" id="tab-usage">`.
Counter-example: a row of styled buttons with `onclick` swapping visible divs,
no `role`, `aria-selected`, or `aria-controls` anywhere.
