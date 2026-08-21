---
id: navigation-patterns-tab-bar-vs-sidebar
title: Choosing tab bar vs sidebar by product shape
category: component
subcategory: navigation
tags: [navigation, tab-bar, sidebar, information-architecture]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, mobile-app, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

The choice between a bottom tab bar and a left sidebar is not a style preference,
it is a function of how many top-level destinations exist and how the product is
held or viewed. Tab bars fit a small, flat destination count on a device the user
holds; sidebars fit a larger or hierarchical destination count on a device the
user views at a fixed distance with a mouse.

- Use a tab bar when there are 3-5 top-level, mutually exclusive destinations and
  the primary input is touch (phone, tablet in portrait).
- Use a sidebar when there are 6+ destinations, when destinations nest into
  sections and sub-sections, or the primary input is mouse/keyboard on a screen
  wide enough to spare 200-280px of fixed-width chrome.
- Never mix the two for the same hierarchy level: a tab bar with a "More" tab
  that opens a second nav pattern signals the wrong pattern was chosen at 3-5.
- On desktop web apps with dense feature sets (dashboards, admin panels), default
  to sidebar; on consumer content apps (feeds, media), default to tab bar even on
  desktop, mirroring the mobile mental model users already have.

Why: a tab bar's items must all be visible at once with no scrolling and no
disclosure, because thumb reach and glanceability are the constraint; a sidebar
can carry a scrolling, expandable list because eye movement across a fixed
panel is cheap. Picking the wrong one forces either an overstuffed tab bar
(reducing tap accuracy and semantic distinctiveness) or an underused sidebar
that wastes horizontal space the content needed.

Example: "iOS app with Home, Inbox, Create, Activity, Profile — five-item tab
bar, no overflow menu."

Counter-example: a 12-item bottom tab bar squeezed into 6 icons plus a "More"
tab that hides half the product's main sections behind an extra tap — this is a
sidebar's job wearing a tab bar's clothes.
