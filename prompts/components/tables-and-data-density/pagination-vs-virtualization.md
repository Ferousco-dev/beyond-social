---
id: tables-and-data-density-pagination-vs-virtualization
title: Choosing pagination versus row virtualization
category: component
subcategory: tables-and-data-density
tags: [tables, pagination, virtualization, performance]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Large tables need one of two strategies to stay usable and performant, chosen by
data size and task, not by default habit: paginate for bounded, page-by-page
review; virtualize (windowed rendering) for scrolling through very large or
open-ended datasets.

- Under roughly 500-1,000 rows, paginate with explicit page controls (25/50/100
  per page) and a visible total count — pagination gives users a concrete sense
  of "how much data exists" and a stable position to return to.
- Above that, or for genuinely unbounded lists (activity logs, search results
  streamed from a backend), virtualize: render only the DOM rows currently in or
  near the viewport (a windowing library, not a raw `.map()` over every record),
  recycling row elements as the user scrolls.
- Never render 5,000+ real DOM rows unpaginated and unvirtualized "to keep it
  simple" — this is the single most common cause of a data table locking up the
  main thread and dropping scroll to single-digit frame rates.
- If virtualizing, preserve keyboard and screen-reader navigation deliberately
  (windowing breaks naive `aria-rowindex` unless it's set from the underlying
  data index, not the rendered DOM position).
- Combine with server-side sort/filter/search once row counts exceed what's
  reasonable to ship to the client at all (typically tens of thousands of rows);
  client-side operations on a partial dataset silently produce wrong results.

Why: pagination and virtualization solve different problems — pagination gives
bounded, memorable positions ("page 3 of 12") useful for review workflows;
virtualization gives smooth continuous scroll through data too large to
meaningfully paginate, like a log stream. Picking the wrong one either makes
review workflows feel choppy or makes continuous data feel artificially chunked.

Example: a 40,000-row transaction ledger using a windowed list rendering ~30 DOM
rows at a time, server-side filtering, and no page-number UI at all.

Counter-example: fetching all 40,000 rows to the client and rendering every one
in an unvirtualized `<table>` "for now" — the tab becomes unresponsive during
initial paint, long before anyone finishes reading row one.
