---
id: model-veo3-single-continuous-shot
title: One clip is one continuous take, never an edited sequence
category: video-prompting
tags: [structure, editing, single-take, shot-list]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.93
---

Veo 3 generates one continuous take per clip, not an edited sequence. A
prompt written like a shot list with cuts inside it ("first we see X, then it
cuts to Y") gets collapsed or ignored, not honored as an edit.

Practice:

- Write each prompt as one unbroken shot: one camera setup, one continuous
  action, for the full duration of the clip.
- If the idea needs multiple angles, generate separate clips per shot and
  assemble the cut in post, rather than asking a single generation to contain
  an edit.
- Describe the shot's beginning and end as one continuous motion ("she
  reaches for the door and opens it") rather than as two discrete beats
  separated by an implied cut.
- When a multi-beat idea is unavoidable, pick the single most important beat
  and let the camera move to follow it, instead of describing sequential
  events as if a cut will separate them.

Why: the model was trained to generate continuous camera-and-action
sequences resembling single takes, not to simulate an edit decision list.
Asking it to "cut to" inside one generation asks for something structurally
outside what a clip is, so it either ignores the cut or produces a warped
hybrid of both beats fighting for the same continuous shot.

Example: "One continuous shot: the door creaks open, and a hand reaches in to
flip the light switch, the room slowly illuminating."
Counter-example: "First a close-up of the doorknob turning, then it cuts to a
wide shot of the room lighting up." Describes an edit, not a single take;
generate these as two separate clips instead.
