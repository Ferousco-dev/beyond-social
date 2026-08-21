---
id: depth-and-layering-scale-occlusion-cues
title: Lock in depth with relative scale and overlap before anything else
category: cinematography
subcategory: composition
tags: [composition, occlusion, scale, blocking]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Depth can be read from a single static frame with no camera movement at all
if nearer objects overlap and are drawn larger than farther same-type
objects. This is the cheapest, most reliable depth cue and should be locked
into blocking before any camera or lighting decision.

- When two similar objects or people appear in a shot, size one visibly
  larger, the nearer one, and let it overlap the edge of the other; never
  place same-sized instances side by side unless they are truly equidistant.
- Direct partial occlusion explicitly: "the barista's shoulder crosses in
  front of the espresso machine," not just listing both as present in the
  scene.
- Use converging lines, a countertop edge, a hallway, a row of tables,
  receding toward a vanishing point to reinforce the same cue
  architecturally.
- Check that nothing critical to the story is occluded; overlap should build
  depth, not hide the subject.

Why: occlusion and relative size are monocular depth cues the visual system
relies on more heavily than focus or color, inherited from how any flat
image, photo, painting, or render implies three-dimensional space. A prompt
that only lists objects without stating scale or overlap leaves the model
free to lay them out flat and equidistant.

Example: "her hand holding the phone fills the lower right of frame,
overlapping the smaller figure of her friend seated across the table."

Counter-example: "two people sitting across a table, both fully visible, same
size in frame" has no overlap or scale differential, reading as a flat
cutout arrangement rather than a table with real depth across it.
