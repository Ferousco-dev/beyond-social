---
id: lenses-and-focal-length-everything-in-focus-tell
title: Uniform sharpness as an AI-look tell
category: cinematography
subcategory: lenses-and-focal-length
tags: [depth-of-field, ai-look, artifacts, realism]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.92
---

Video where the foreground, subject, and background are all rendered equally
sharp is one of the fastest ways a viewer's eye clocks a clip as synthetic,
because no lens at a normal working distance and aperture actually behaves
that way outside of small-sensor phone cameras with heavy computational depth
faking.

- Always name an aperture or a depth-of-field outcome in the prompt, never
  leave focus falloff unspecified, since an unspecified depth cue tends to
  default toward an artificially deep, evenly sharp render.
- For any shot with a background more than a few feet behind the subject,
  explicitly state that it should soften: "background several feet back,
  rendered soft and low-contrast relative to the subject."
- Watch especially for wide establishing shots, where "everything sharp" is
  sometimes correct (small aperture, deep focus) but should be a deliberate
  choice, named as such, rather than the default absence of any depth cue.
- If depth of field looks uniform in a generated draft with no aperture named
  in the prompt, that is a signal to add one, not to accept the output as is.

Why: real optics have a focal plane and a circle of confusion that fall off
predictably with distance and aperture; a render that ignores this constraint
produces an infinite-depth-of-field look that no consumer or cinema camera
naturally produces, which is exactly the kind of physically-impossible
uniformity that reads as machine-generated rather than camera-captured.

Example: "50mm at f/2.2, subject sharp, background four feet back falling
into soft, low-contrast shapes."
Counter-example: a prompt describing subject, setting, and action with no
aperture or focus falloff mentioned at all, which risks an artificially deep,
edge-to-edge-sharp frame that no real lens at that framing would produce.
