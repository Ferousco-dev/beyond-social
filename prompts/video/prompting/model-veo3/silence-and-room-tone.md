---
id: model-veo3-silence-and-room-tone
title: Silence is a choice you have to state, not a default
category: video-prompting
tags: [audio, silence, room-tone, mood]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, ad-creative, product-video]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

An unscored, unscripted-audio prompt does not default to quiet. It defaults
to the model's generic idea of what a scene like this "should" sound like,
which usually includes music. Real silence, or near-silence with only room
tone, has to be requested on purpose.

Practice:

- State the absence of music directly when a scene should carry only
  ambience: "no music, just the quiet hum of the room."
- Describe one or two faint sounds that make silence read as real rather than
  dead air: a distant clock, HVAC hum, faint traffic bleed, breathing. True
  silence in a generated clip can read as a technical dropout rather than a
  mood.
- Use silence deliberately for tension or intimacy beats (a held reaction
  shot, a quiet confession) where a music bed would undercut the moment, and
  say so: "tense silence, only her breathing audible."
- Don't pair a "no music" instruction with a performance that reads as if it
  needs underscore (a triumphant speech). The absence will feel like a
  mismatch, not a style choice, unless the visual and performance are written
  to sit comfortably unscored.

Why: "no sound described" isn't a neutral instruction, it's an underspecified
one, and the model fills the gap with its prior for the genre it thinks it's
generating, the same way an undescribed background fills with a generic
environment. Naming silence as a positive choice, with a texture of room
tone, is what actually produces quiet rather than a default score.

Example: "Only the faint hum of the refrigerator and her slow breathing; no
music, no dialogue."
Counter-example: describing a quiet, still shot with zero audio guidance and
getting a swelling piano score that fights the intended stillness.
