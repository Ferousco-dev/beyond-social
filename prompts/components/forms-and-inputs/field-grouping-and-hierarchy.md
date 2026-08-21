---
id: forms-and-inputs-field-grouping-and-hierarchy
title: Field grouping and visual hierarchy
category: component
subcategory: forms-and-inputs
tags: [forms, layout, grouping, hierarchy]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site, onboarding, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

A long form reads as a wall of identical boxes unless related fields are
grouped and the grouping is visible before the user reads a single label.

The recipe:

- Cluster related fields (city/state/zip, or first/last name) with tighter
  spacing between them than between unrelated field groups, so proximity
  alone signals the relationship before the labels are read.
- Give each logical section a short heading ("Shipping address," "Payment
  details") when the form covers more than one topic, rather than one long
  undifferentiated list of fields.
- Use a single-column layout for the primary flow; multi-column layouts save
  vertical space but force the eye to zigzag, which measurably slows
  completion on anything but tightly paired fields like city/state.
- Keep field width proportional to expected answer length — a zip code input
  shouldn't stretch full-width, since a full-width short field signals "long
  answer expected" and briefly confuses the user's estimate of the task.
- Reserve horizontal pairing (two fields on one row) for fields that are
  genuinely short and related; pairing unrelated fields to save vertical
  space breaks the proximity signal you're relying on elsewhere.

Why: grouping is a scanning shortcut — before reading any label, the user's
eye parses the layout for chunks, and if the chunks correspond to real
conceptual groups, the form is legible at a glance; if spacing is uniform
throughout, every field looks equally related (or unrelated) to every other.

Example: "City," "State," "ZIP" on one row with 8px gaps between them, then a
32px gap before the next section, "Payment details," with its own heading.

Counter-example: fifteen fields in a single column, uniform 16px gaps between
every one, no section headings, and a "ZIP code" input stretched to the same
full width as the "Street address" field above it.
