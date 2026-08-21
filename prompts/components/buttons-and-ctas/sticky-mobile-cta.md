---
id: buttons-and-ctas-sticky-mobile-cta
title: Sticky CTA bars on mobile
category: component
subcategory: buttons-and-ctas
tags: [cta, mobile, sticky, scroll]
applicability:
  platforms: [mobile, web]
  productTypes: [landing-page, e-commerce, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

On a long mobile page, the primary CTA should stay reachable without the user
scrolling back up to find it — a sticky bar pinned to the bottom of the
viewport keeps the action available at every point in the scroll.

The recipe:

- Pin a single primary CTA (and, if needed, a price or a one-line context
  string) to the bottom of the viewport once the user scrolls past the
  original CTA's position, not from the first frame — showing it immediately
  duplicates the hero CTA and wastes vertical space.
- Keep the bar height compact, roughly 56-64px, with the button filling most
  of the width so it clears the mobile hit-target minimum with margin.
  Respect the iOS safe-area inset so the bar doesn't collide with the home
  indicator.
- Match the sticky CTA's copy exactly to the CTA it's replacing — don't
  introduce a second, differently-worded action that makes the user wonder if
  it does something different.
- Give the bar a subtle top border or shadow to separate it from scrolling
  content behind it; without a visual seam it can read as page content rather
  than a fixed control.
- Hide or shrink the bar when a native keyboard is open (e.g. the user is
  typing in a chat field) so it doesn't fight for the same screen space.

Why: mobile CTAs lose effectiveness the moment they scroll off-screen, because
returning to them requires the user to remember the CTA existed and manually
scroll back — friction that kills a meaningful fraction of otherwise-ready
conversions on long product or landing pages.

Example: a product page where "Add to cart — $48" pins to the bottom bar the
moment the hero's "Add to cart" button scrolls out of view.

Counter-example: a sticky bar visible from page load with a CTA that reads
differently from the hero CTA above it, leaving the user unsure which one to
trust.
