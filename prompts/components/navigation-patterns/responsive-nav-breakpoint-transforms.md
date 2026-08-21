---
id: navigation-patterns-responsive-nav-breakpoints
title: Transforming sidebar navigation across responsive breakpoints
category: component
subcategory: navigation
tags: [navigation, responsive, sidebar, tab-bar]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A dashboard's navigation should change pattern, not just size, as viewport
shrinks: full sidebar on desktop, collapsed icon rail on tablet-landscape, and
a bottom tab bar or full-screen drawer on phone-width — each optimized for the
input and reach available at that width, not a single component squeezed
smaller.

- Desktop (≥1024px): full sidebar, 200-280px, labels visible.
- Tablet/narrow desktop (768-1023px): auto-collapse to icon rail (56-64px);
  expand on hover or explicit toggle, never permanently hidden.
- Phone (<768px): replace the sidebar entirely with a bottom tab bar carrying
  the 3-5 most-used sections; move everything else into an account/menu
  screen reachable from a profile tab, not a hamburger bolted onto a phone-
  width sidebar.
- Pick each breakpoint's item set deliberately — do not assume the same items
  matter at every width; a "Reports" section usable with a mouse and a wide
  table might not deserve tab-bar-level prominence on a phone.
- Test the transition points themselves, not just the two end states — a
  window resized slowly across 1024px and 768px should never show a flash of
  unstyled or overlapping nav.

Why: sidebar navigation assumes spare horizontal width and a mouse; tab bars
assume a handheld device and thumb reach. A single component that merely
scales down at breakpoints keeps making the wrong assumption at the width
where the assumption stopped holding, producing a cramped sidebar trying to be
a phone nav instead of an actual phone nav pattern.

Example: "1280px: full sidebar with labels. 900px: icon rail. 500px: bottom tab
bar with 5 items, rest under a Profile tab's menu list."

Counter-example: a 240px sidebar that simply shrinks to 90px on mobile,
truncating every label to two characters and requiring horizontal scroll to
read item names.
