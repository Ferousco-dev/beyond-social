---
id: subject-consistency-descriptions-reference-image-anchoring
title: Dividing labor between a reference image and text description
category: video-prompting
subcategory: subject-consistency-descriptions
tags: [subject-consistency, reference-image, character-description, product-consistency]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.83
---

When a reference image is available, the text description should do a narrower
job than when working from text alone: name what the reference doesn't
reliably transfer, rather than re-describing everything the image already
shows.

- Let the reference image carry structural identity — face shape, product
  geometry — and use text only for what tends to drift even with a reference
  present: exact wardrobe, marking locations, color qualifiers.
- Explicitly state what must persist from the reference ("same face, same mole
  placement as reference") rather than assuming every part of the image is
  treated as equally fixed.
- Never contradict the reference in text — if the reference shows a black
  jacket, don't write "gray jacket" hoping the reference wins; which one takes
  priority is inconsistent across models and shots.
- Use text to lock what's most likely to drift across a multi-shot sequence
  even with a reference present: hairstyle under movement, incidental
  accessories, exact wording on a label.

Why: reference images anchor overall likeness strongly but not uniformly across
every attribute. Treating text and image as one merged, non-contradictory
description gets more reliable results than expecting the image alone to
constrain everything, because some attributes (fine wardrobe detail, label
text) are exactly where reference-image transfer tends to be weakest.

Example: reference photo attached; text adds "same face and mole placement as
reference; wearing the same olive canvas jacket in every shot, sleeves rolled
to mid-forearm."

Counter-example: attaching a reference image of a red car, then writing "a blue
sports car" hoping the text overrides the image — produces unpredictable,
inconsistent color results shot to shot instead of a clean override.
