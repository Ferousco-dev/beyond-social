---
id: negative-prompting-uncanny-gaze
title: Excluding the dead-eyed, unblinking stare
category: video-prompting
subcategory: negative-prompting
tags: [negative-prompt, eyes, gaze, talking-avatar]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, ugc, short-form-video]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

Human eyes blink roughly every three to six seconds, saccade in small quick
jumps between fixation points, and the gaze drifts off-axis briefly rather
than locking dead center on the lens. Generated faces frequently miss all
three, producing a stare that reads as synthetic within the first second even
when the rest of the face looks convincing.

What to exclude and what to request in its place:

- Exclude "unblinking, fixed stare, glassy eyes, perfect eye contact held
  continuously." Fixed eye contact for an entire shot is itself the artifact,
  not a sign of quality.
- Exclude "symmetric blink" — real blinks are not perfectly synchronized
  between both eyes and vary slightly in duration.
- Request natural saccades: "gaze shifts slightly off-lens every few seconds,
  brief downward glance before a key line."
- For talking-avatar shots specifically, tie the blink to the speech: a blink
  landing on a natural pause or consonant reads as motivated; a blink on a
  metronomic timer reads as an animation loop.

Why: the eyes are the highest-scrutiny region of any face shot because viewers
fixate there first; a model that gets skin and lighting right but keeps the
eyes locked and unblinking still fails the "is this real" test instantly,
since the failure sits exactly where attention concentrates.

Example: "natural intermittent blinking, gaze drifts slightly off-camera
between lines, no fixed stare."
Counter-example: "make direct, unwavering eye contact with the viewer for the
entire shot" — this is the instruction that produces the artifact, phrased as
if it were the fix.
