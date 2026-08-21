---
id: settings-and-account-pages-rail-plus-panel-pattern
title: The rail-plus-panel pattern for settings
category: layout
subcategory: navigation-structure
tags: [settings, navigation, information-architecture, saas]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

A persistent left rail of category labels paired with a right-hand content
panel is the correct default for any settings surface with five or more
top-level sections, because settings are consulted like a reference, not read
like a story.

The recipe:

- Reserve the rail for 5+ top-level sections (Profile, Account, Security,
  Notifications, Billing, Integrations); below that, a simple tab bar or a
  single scrolling page adds chrome without adding usability.
- Fix the rail width (roughly 200-240px), not fluid — section labels are short
  and known in advance, unlike a primary nav that must fit variable content.
- Mark the active rail item with a full-row background fill, not a color
  change on the label text alone, so state reads from peripheral vision while
  scanning.
- Let the panel scroll independently of the rail; the rail stays pinned so a
  long section like Billing never disorients the user by scrolling the map
  away with the content.
- Route every rail item to its own URL so back button, bookmarks, and support
  links land on the right section directly.

Why: users treat settings as something they dip into to answer one question,
then leave. A rail is a spatial index they can hold in their head across
visits; a linear scroll or a rebuilt-per-click page forces them to relearn the
layout every time, which is the wrong cost to impose on an infrequently-used
surface.

Example: fixed 224px rail, six rows with 16px icons, active row filled with
the primary color at 8% opacity, each row routed to /settings/<section>.
Counter-example: a rail collapsed into a hamburger dropdown on desktop to save
width — it hides the map the rail exists to provide and adds a click to every
section change for no real space savings.
