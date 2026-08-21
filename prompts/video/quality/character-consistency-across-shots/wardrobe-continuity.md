---
id: character-consistency-across-shots-wardrobe-continuity
title: Spec wardrobe like a script supervisor, not like a stylist
category: video-quality
subcategory: character-consistency
tags: [character-consistency, wardrobe, continuity, production]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, ugc]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

On a real set, the script supervisor logs exact wardrobe (down to which sleeve is
rolled up) so retakes match. Generated video needs the same discipline: garment
description has to be specific enough that the model can't quietly substitute a
different but plausible outfit shot to shot.

The recipe:

- Name garments by type, color, and one construction detail: "cream cable-knit
  cardigan, brass buttons," not "a cozy sweater."
- Lock accessory state explicitly: which wrist the watch is on, glasses on or in
  hand, sleeves rolled to elbow or cuffed — state it every time, since the model has
  no memory of shot one's choice.
- If the sequence spans a time jump within one scene (walks from a car to a door),
  keep wardrobe identical across those shots; only change it when the story logic
  changes it (a new scene, a new day).
- Treat wardrobe as part of the frozen identity clause for any sequence meant to read
  as continuous, not as free shot-to-shot styling.
- Flag deliberate wardrobe changes explicitly in the prompt ("now wearing a red
  jacket over the same cardigan") so the change reads as intentional rather than as
  drift.

Why: viewers track wardrobe continuity almost as closely as face continuity, and
inconsistent clothing is one of the fastest ways an edited sequence reads as
synthetic, because real single-scene footage cannot casually change a shirt collar
between cuts.

Example: "cream cable-knit cardigan, brass buttons, sleeves pushed to the elbow" used
verbatim in every prompt for the scene.
Counter-example: prompting "a warm sweater" in one shot and "a knit top" in the next
and getting two different garments in the finished sequence.
