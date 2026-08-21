---
id: hands-faces-and-text-in-frame-on-screen-text-rendering-avoidance
title: Not asking the model to render legible text
category: video-quality
tags: [text, typography, artifacts, prompting]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, explainer]
  styles: []
source: authored
version: 1
priorQuality: 0.92
---

Video generation models render text as visual texture, not as characters, so any
prompt that asks for specific readable words in-scene (a sign, a screen, a label
with copy on it) will almost always come back warped, misspelled, or melting
between frames; the fix is to never ask the generator to do this job at all.

What to do instead:

- Write scene descriptions that avoid specifying exact on-screen wording; describe
  a sign or screen as present and generically lit or blank rather than quoting
  its text.
- If a scene needs a screen or sign for realism, keep it out of focus, at a
  distance, or angled away enough that no text needs to resolve clearly.
- Any word, headline, caption, price, or CTA the audience must actually read
  belongs in a post-production text overlay pass, not in the generation prompt.
- When a product's real packaging has text on it, treat the whole label as a
  locked image asset (see the logo and label handling entry) rather than asking
  the model to generate new text matching the brand.
- If a UI screen must appear on a device in-shot, use a real screen-recording or
  static mockup composited in post rather than a generated screen with invented
  interface text.

Why: character-level fidelity requires the model to reproduce exact stroke shapes
consistently across every frame at video resolution, which is a much harder and
different task than rendering plausible general imagery, and it's the single most
reliable way to make a shot look unmistakably AI-generated if it's asked for directly.

Example: "a blurred storefront sign in the background, softly lit, no legible text."
Counter-example: "a neon sign reading 'OPEN 24 HOURS' glowing above the door" —
virtually guaranteed to render as garbled, shifting characters across the shot.
