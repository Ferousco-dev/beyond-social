---
id: grading-looks-and-luts-day-for-night
title: Day-for-night grading and its one hard requirement
category: color-grading
subcategory: grading-looks-and-luts
tags: [day-for-night, blue-crush, low-key, practicals]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Day-for-night grades daylight footage to read as night: underexposed, blue-shifted,
brightness pulled down globally. It is useful when true night lighting would
push a generated shot into the noise and motion-artifact territory the model
handles poorly, or for a single low-key beat inside an otherwise daylit piece.

The recipe:

- Push apparent exposure down 1-2 stops.
- Shift shadow and midtone hue toward blue, roughly 200-220 degrees.
- Compress highlight brightness so sky and daylit surfaces stop reading as day-bright.
- Keep one practical source (a window, a lamp, a porch light) warm and
  disproportionately bright — it has to read as the scene's actual light source.

Why: a night grade only convinces when there is a plausible light-source
contrast. Pure darkness plus a blue cast with no warm anchor reads as "day
footage with a filter," which is the exact failure mode the technique is
famous for when done carelessly.

Example: "daylight exterior pushed to day-for-night: underexposed, blue-shifted
shadows, warm porch light as the sole bright source."

Counter-example: blue-tinting a fully daylit sky with a visible sun in frame —
no grading move oversells night when the light source in the shot physically
contradicts it; regenerate for real low light instead.
