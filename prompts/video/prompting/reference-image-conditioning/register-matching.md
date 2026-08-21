---
id: reference-image-conditioning-register-matching
title: Matching the reference's visual register to the target output
category: video-prompting
subcategory: reference-image-conditioning
tags: [image-to-video, ugc, register, authenticity]
applicability:
  platforms: [tiktok, instagram]
  productTypes: [ugc, short-form-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

The reference image's visual register — phone snapshot, DSLR product shot,
screen-recorded — sets an implicit contract for the whole clip, and text
describing a different register than the image's own will lose to the image
almost every time.

- Match the reference's camera signature to the target output before writing
  the prompt: a phone-quality reference (slight softness, modest dynamic range,
  on-axis flash or window light) should be pushed toward more handheld,
  unpolished motion in text, not toward "cinematic."
- If the deliverable needs to look like authentic UGC, source or shoot the
  reference as an actual phone photo rather than a studio photo you intend to
  "rough up" with text; the model preserves the studio image's clean optical
  signature (perfect focus falloff, even lighting) no matter how casual the
  prompt language is.
- Conversely, don't feed a grainy low-light phone reference into a shot that
  needs to read as a premium product film; "cinema grade" language in the
  prompt won't remove the source's inherent softness and noise pattern.
- When in doubt, choose the reference for the register you need first, then
  write motion and mood on top; register is much harder to change after the
  fact than motion is.

Why: register lives in the optical and sensor-level detail of the image itself
— lens softness, sensor noise, dynamic range — none of which text can
convincingly override because the model is conditioned on the reference's
actual pixels; text can add or change motion and event, but it cannot
retroactively swap the virtual camera and lens that produced the still.

Example: an actual handheld phone photo, slightly soft, natural indoor light, as
the reference for a UGC testimonial clip; prompt only adds subtle head movement
and blink timing.

Counter-example: a tripod-shot, studio-lit product photo used as the reference
while the prompt asks for "casual iPhone selfie video energy"; the output keeps
the studio's clean falloff and static geometry no matter how the text is
worded.
