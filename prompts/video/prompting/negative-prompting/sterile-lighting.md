---
id: negative-prompting-sterile-lighting
title: Excluding sterile, shadowless studio lighting
category: video-prompting
subcategory: negative-prompting
tags: [negative-prompt, lighting, cinematography, realism]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.89
---

Default generations light a subject as if from an even, all-directions
softbox: no visible key direction, no falloff, shadows nearly absent. Real
light, whether a single practical lamp or open sky, comes from a direction and
falls off as it travels, leaving a visible dark side to every lit subject.

What to exclude and the lighting vocabulary to specify instead:

- Exclude "even lighting from all sides, shadowless, flat lighting, no
  falloff" as literal terms.
- Specify a single directional source and let the shadow follow from it:
  "window light from camera-left, falloff into shadow on the right side of
  the face." Naming the source does more work than naming the absence.
- Exclude "studio three-point lighting with fill eliminating all shadow,"
  which is the specific rig that produces the flat, shadowless default even
  when a director asks for something moodier.
- For product shots, exclude "light wrapping evenly around all edges of the
  product," since real product photography still shows a dominant key
  direction even in a lightbox setup.

Why: falloff and shadow direction are how a viewer's visual system infers a
light source and, by extension, a real physical space; light that arrives
from nowhere and falls on nothing unevenly reads as rendered rather than
photographed, regardless of how detailed the subject itself looks.

Example: "single practical lamp camera-right, hard falloff into shadow across
the far side of the room, no fill light."
Counter-example: "bright, evenly lit, professional studio lighting with no
shadows" — a request for the flat default, phrased as a request for quality.
