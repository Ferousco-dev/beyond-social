---
id: character-consistency-across-shots-batching-strategy
title: Generate by setup, not by story order, the way a set actually shoots
category: video-quality
subcategory: character-consistency
tags: [character-consistency, production-workflow, batching, efficiency]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Real productions shoot "out of order": every angle of one setup gets captured before
the crew relights and moves to the next setup, because moving the camera and lights
is expensive and continuity is easier to hold within one unbroken block of takes.
Generation should batch the same way, even though moving a camera costs nothing here.

The recipe:

- Group the shot list by camera setup and lighting condition, not by narrative
  sequence, and generate all shots in one setup back to back, using the same locked
  identity clause, reference image, lens, and lighting spec for the whole batch.
- Only change one variable at a time between generations within a batch (action or
  expression), keeping identity, wardrobe, lighting, and lens fixed, so any drift you
  see is attributable to that one change.
- Reassemble the batches into story order only at the edit stage, after generation,
  the same way dailies get assembled from out-of-order takes.
- When a batch's reference frame or lock has to change (new setup), treat that as a
  deliberate checkpoint and re-verify identity against the previous batch before
  moving on, rather than discovering the mismatch after the whole sequence is cut.
- Keep a running log of which reference image and locked clause fed which batch, so a
  drifted shot can be traced back to its source setup instead of re-guessed.

Why: batching by setup minimizes the number of times you re-establish identity from
scratch, and it isolates variables the way a controlled experiment would, making it
possible to tell whether a mismatch came from the prompt, the reference, or normal
sampling variance.

Example: generating all four close-up reaction shots for one scene consecutively from
one locked reference before moving to the wide establishing shot.
Counter-example: generating every shot strictly in story order, re-deriving identity
from a fresh text prompt each time, so error compounds shot over shot with no
checkpoint to catch it.
