---
id: tables-and-data-density-numeric-column-alignment
title: Numeric column alignment and tabular figures
category: component
subcategory: tables-and-data-density
tags: [tables, typography, numbers, alignment]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Numbers in a data table are compared vertically, digit by digit, so their column
must right-align and use fixed-width (tabular) figures, while text columns stay
left-aligned.

- Right-align every numeric column: currency, counts, percentages, IDs used for
  magnitude comparison. Left-align text columns: names, statuses, free-text
  fields.
- Set `font-variant-numeric: tabular-nums` (or a typeface with true tabular
  figures) on numeric cells so every digit occupies the same width — without it,
  a "1" and a "8" occupy different widths and the decimal points in a column of
  prices drift out of vertical alignment.
- Align decimal points, not just the right edge, when a column mixes different
  precisions (e.g., $12.00 vs $8.5) by padding trailing zeros consistently rather
  than trimming them.
- Keep unit labels (currency symbol, %) outside the tabular-nums run or in a
  fixed-width prefix/suffix slot so they don't shift the digit alignment column
  to column.
- Center-align only columns that are neither text-scanned nor magnitude-compared,
  such as a small icon or a single-character status glyph — center alignment is
  rarely correct for anything else in a data table.

Why: the entire point of a numeric column is letting the eye sweep straight down
and compare magnitudes without reading each value in full; proportional-width
digits and left-alignment both defeat that by making the ones place land in a
different horizontal position on every row.

Example: a "Revenue" column using `font-variant-numeric: tabular-nums;
text-align: right` rendering "$1,204.00" directly above "$  84.50" with both
decimal points vertically aligned.

Counter-example: left-aligning a currency column so "$1,204.00" and "$84.50"
start flush at the same left edge — the numbers become impossible to compare by
magnitude at a glance, defeating the reason someone put them in a table.
