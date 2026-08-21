---
id: subject-consistency-descriptions-shot-to-shot-carryover
title: Copying the identity paragraph verbatim across a shot sequence
category: video-prompting
subcategory: subject-consistency-descriptions
tags: [subject-consistency, continuity, sequencing, character-description]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Consistency across a multi-shot sequence depends on copying the identical
identity sentence verbatim into every shot prompt, not re-describing the subject
from memory each time.

- Draft one canonical identity paragraph before writing any individual shot.
- Copy-paste that exact paragraph into every subsequent shot prompt unchanged,
  even when it feels repetitive to type out again.
- Append shot-specific direction — action, framing, lighting — after the frozen
  identity block; never rewrite the identity block inline to fit the shot.
- If a description needs to change because it produced an error, edit the
  canonical paragraph once and repropagate the fix to every remaining shot,
  rather than patching only the shot that failed.

Why: paraphrasing "the same idea" in slightly different words each time is
exactly how drift compounds over a sequence. Each small word-choice difference
nudges the model's interpretation a little, and over five or ten shots those
small nudges accumulate into a subject who no longer looks like they did in
shot one.

Example: shot 3 and shot 7 both open with the identical sentence — "a woman with
a squared jaw, close-set brown eyes, a mole below her left eye, wearing a faded
olive-green canvas jacket."

Counter-example: shot 3 says "brown-eyed woman in a green jacket," shot 7 says
"woman with dark eyes in an olive coat" — similar enough to seem intentional,
different enough in the actual footage to read as two different people spliced
into one sequence.
