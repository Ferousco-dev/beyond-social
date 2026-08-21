---
id: subject-consistency-descriptions-wardrobe-lock
title: Locking wardrobe with reused, literal garment description
category: video-prompting
subcategory: subject-consistency-descriptions
tags: [subject-consistency, wardrobe, continuity, character-description]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, ugc, ad-creative, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Wardrobe needs the same anchor treatment as the face for a multi-shot sequence to
hold together: specific, literal garment description, reused verbatim.

- Describe the garment by cut, named color, fabric, and one distinguishing detail
  — a stitched logo, a frayed cuff, a visible seam.
- Note how it is worn, since this drifts easily: top button undone, sleeves rolled
  to mid-forearm, collar popped.
- Copy the identical wardrobe sentence into every shot in the sequence rather than
  re-describing it from memory each time.
- Keep wardrobe separate from set dressing and accessories that are allowed to
  vary shot to shot, so the model isn't asked to hold everything equally fixed.

Why: wardrobe covers a large fraction of the visible frame, so any drift — a
shirt's color shifting, a collar changing shape, a jacket losing its cuff detail —
reads as a much bigger continuity break to a viewer than a subtle change in facial
structure would.

Example: repeated in every shot: "a faded olive-green canvas jacket, collar
frayed at the left edge, sleeves rolled to mid-forearm."

Counter-example: shot one says "casual jacket," shot four says "light zip-up" —
loose enough language that the model reinterprets cut, color, and fit differently
each time, so the jacket effectively changes between shots.
