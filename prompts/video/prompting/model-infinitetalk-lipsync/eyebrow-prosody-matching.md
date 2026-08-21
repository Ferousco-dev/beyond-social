---
id: model-infinitetalk-lipsync-eyebrow-prosody-matching
title: Matching eyebrow and upper-face motion to vocal emphasis
category: video-prompting
subcategory: head-movement
tags: [infinitetalk, eyebrows, prosody, expression]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, ad-creative, explainer]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Lip-sync models are graded on the mouth, but viewers judge believability from
the upper face. A mouth that is technically in sync while the eyebrows and
forehead stay frozen produces a split, "mask over a mask" effect, because real
speech raises the brows on stressed words and questions almost involuntarily.

- Name the emotional register of the read in the prompt ("earnest,
  slightly upbeat delivery") so brow and eye motion has something to attach
  to, rather than defaulting to neutral.
- Call out question intonation specifically: "brows lift slightly on the
  question at the end," since rising pitch without matching brow motion is a
  common giveaway in synthetic delivery.
- Keep brow motion subtle and continuous rather than asking for named
  expressions ("surprised," "excited") which the model tends to render as a
  held pose instead of a transient reaction.
- Pair this with the driving audio's actual prosody; a flat, monotone voice
  track gives the model no stress pattern to hang brow motion on, no matter
  what the prompt says.

Why: prosody, the pitch and stress pattern of speech, and upper-face motion
are neurologically linked in humans; viewers read that link unconsciously, so
a mismatch between audible emphasis and visible stillness above the mouth
registers as wrong even when nobody can name why.

Example: "warm, conversational delivery, subtle brow raise on the emphasized
word in the second sentence, natural forehead micro-movement throughout."

Counter-example: an energetic, exclamation-heavy voice track paired with a
prompt that only addresses the mouth, the delivery sounds animated while the
face above the lips stays completely inert.
