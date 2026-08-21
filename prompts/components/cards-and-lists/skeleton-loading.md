---
id: cards-and-lists-skeleton-loading
title: Skeleton states for lists and cards
category: component
subcategory: cards-and-lists
tags: [loading, skeleton, performance, cls]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

A skeleton loader should be a geometric preview of the exact content that's coming, not a generic shimmer block dropped into an empty area.

- Match skeleton shapes to real content: a thumbnail-sized block, a title-width bar, a metadata-width bar, all at the same row height as the loaded state so nothing reflows once data arrives.
- Keep shimmer subtle or absent; a wall of strobing shimmer across twenty rows reads as "fake loading" and is fatiguing rather than reassuring.
- Cap skeleton rows to what the viewport actually shows — don't render fifty skeleton rows for a list that will eventually paginate or infinite-scroll.
- Delay the skeleton's appearance until a short threshold (roughly 150ms) has passed; flashing a skeleton for one frame on a fast load looks like a rendering glitch, not a loading state.
- Never substitute a spinner for structured list content when the shape of the data is already known — a skeleton preserves layout and perceived speed in a way a centered spinner cannot.

Why: this is a layout-shift and perceived-performance problem as much as a visual one. A skeleton that mirrors the final geometry prevents cumulative layout shift when content swaps in, and gives the user an accurate read on how much is about to load. A skeleton that doesn't match the eventual shape, or that appears and vanishes within a single frame, actively undermines trust that the interface is stable — which matters more for a product whose credibility depends on not looking assembled from a generic template.

Example: "skeleton: 40px square thumbnail, 60%-width title bar, 30%-width metadata bar, 56px row height matching the loaded row exactly."
Counter-example: a single centered spinner over a blank list area, then content pops in all at once and shifts everything below it down the page.
