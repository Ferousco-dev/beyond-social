---
id: micro-interactions-skeleton-vs-spinner
title: Skeleton screens versus spinners
category: motion
subcategory: interaction-design
tags: [loading-state, skeleton, spinner, perceived-performance]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, e-commerce, mobile-app]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Skeleton screens and spinners answer different questions, and picking the wrong
one for the situation wastes the chance to set correct expectations while content
loads.

- Use a skeleton when the incoming content has a known, structured shape (a feed
  of cards, a table, a profile layout) and the wait is roughly 300ms to a few
  seconds. Match the skeleton's grid exactly to the real layout so nothing reflows
  when content arrives.
- Animate the skeleton with a slow shimmer sweep, about 1.5s per loop, ease-in-out,
  rather than a static gray block; the motion itself signals "still working" over
  a longer wait.
- Use a spinner only for genuinely unstructured or indeterminate waits (a
  background job, a full-page transition) or waits expected to stay under about
  a second, where building a skeleton layout isn't worth the effort.
- Never combine both for the same load; showing a spinner that then gives way to
  a skeleton (or vice versa) reads as two different loading systems fighting.
- If a load can exceed 8-10 seconds, replace either pattern with a real progress
  indicator or a status message; an indeterminate spinner past that point starts
  to feel like a stall rather than an active process.

Why: a skeleton previews the shape of what's coming, which lets the eye start
parsing layout before the actual data exists, measurably reducing perceived wait
compared to a blank screen plus a generic spinner. A spinner carries no shape
information at all, so using it for content whose structure is already known
throws away a real usability advantage, while forcing a skeleton onto a trivial,
sub-second, structure-less fetch is design effort spent where users won't
notice the difference anyway.

Example: a product grid renders 12 skeleton cards in the exact grid the real
products will occupy, each with a shimmering image block and two text-line bars.

Counter-example: a full-page centered spinner while a list of already-known-shape
cards loads behind it. When the spinner is replaced, the whole layout appears at
once and the user has had zero warning of what was coming or how much of it.
