---
id: model-veo3-voice-description
title: Describe voice as physical fact, not a mood adjective
category: video-prompting
tags: [voice, audio, character, dialogue]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, ugc, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Veo 3 generates the voice performance itself, so vocal qualities need the same
concrete, physical description as anything visual: register, accent, pace,
and one texture detail, not a mood word standing alone.

Practice:

- Specify register and pace as physical facts: "low, gravelly voice, speaking
  slowly" rather than "authoritative voice," which has no acoustic target.
- Name an accent by region or quality when it matters ("soft Irish accent")
  rather than a generic label like "foreign accent," which points nowhere
  consistent.
- Add one texture cue when it's relevant to the scene: breathy, nasal, raspy
  from a cold, out of breath from running. These render more reliably than
  emotional labels like "angry voice" used alone.
- Keep the described voice consistent with the character's visible
  presentation; describing a small child with a deep bass register creates a
  mismatch the model often resolves by defaulting to a generic middle voice.

Why: this is the same "cash out the adjective" principle that governs visual
prompting, applied to sound. "Authoritative" isn't a renderable audio target,
but "low pitch, unhurried pace, slight rasp" is a set of measurable qualities
the model can actually approximate, the way a casting director's notes
describe a voice by its physical properties rather than its overall effect.

Example: "an older man with a low, gravelly voice, speaking slowly and
deliberately, slight Southern drawl."
Counter-example: "confident, powerful, professional voice." Three mood words
with no acoustic content for the model to render.
