---
id: hands-faces-and-text-in-frame-text-overlay-post-production
title: Doing readable text as a post-production overlay
category: video-quality
tags: [text, captions, post-production, editing]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, ad-creative, explainer, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

Every word the audience is meant to actually read, captions, callouts, price
tags, CTA buttons, should be typeset and composited after generation, the same
way an editor adds lower-thirds to real footage rather than asking the camera
operator to somehow shoot the words into the scene.

The recipe:

- Generate the underlying footage with no on-screen text requested at all, then
  add captions and callouts as a separate typography layer in the edit.
- Use the platform's actual native caption style as the baseline (bold sans
  caption font, high-contrast fill, thin stroke or drop shadow) rather than a
  novel typeface, since native-looking captions read as intentional and don't
  compete with the footage.
- Time text overlays to cuts or clear holds in the footage, not over camera
  movement or a busy background, so the words stay legible without needing heavy
  outlines to fight the motion underneath.
- Keep overlay copy short per screen (roughly 3-6 words at a time) and matched to
  spoken pacing if there's a voiceover, the same discipline a caption editor
  applies to broadcast subtitles.
- Reserve any brand-locked wordmark or logo overlay for a clean, static moment in
  the edit rather than pinning it to a moving generated shot underneath.

Why: post-production text compositing is a solved, pixel-perfect typesetting
problem with full control over kerning, timing, and contrast, while asking a
generation model to render the same words in-scene reintroduces the exact
character-fidelity failure this whole overlay approach exists to avoid.

Example: "generate the b-roll with no text; add a bold white caption with subtle
shadow, timed to the voiceover, over the static hold at the end of the shot."
Counter-example: "prompt the model to show the CTA text baked into the video
frame" — reintroduces melting, misspelled on-screen text that post-production
overlay was specifically avoiding.
