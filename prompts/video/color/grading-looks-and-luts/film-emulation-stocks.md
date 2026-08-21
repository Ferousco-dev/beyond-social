---
id: grading-looks-and-luts-film-emulation-stocks
title: Naming a film stock instead of saying cinematic
category: color-grading
subcategory: grading-looks-and-luts
tags: [film-emulation, kodak, fujifilm, stock-reference]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

"Cinematic" names a category with dozens of unrelated looks inside it; a named
film stock names one reproducible tonal signature. Prompting and grading
against a specific stock gets a specific, learnable result.

Reference points worth knowing:

- Kodak Portra 400: soft, warm skin, low contrast, pastel shadow rolloff.
- Kodak Vision3 5219: cinema tungsten stock, deep blacks, desaturated highlight rolloff.
- Fujifilm Eterna: cooler balance, low contrast, a teal shadow bias common in Japanese commercial work.
- Kodak 2383: the standard print stock most digital cinema grades start from — slightly lifted blacks, soft highlight rolloff.

Why: each stock's chemistry produces a specific, documented tonal curve that a
trained colorist (or a trained model) can target and reproduce consistently.
"Cinematic" gives no such target — two people asked for "cinematic" will
produce two unrelated grades, while two people asked for "Portra 400" will
converge.

Example: "Portra 400 emulation, soft warm skin tones, gently rolled-off
highlights, minimal shadow crush."

Counter-example: prompting "make it look like film" with no stock named —
produces an inconsistent, generic orange wash that matches no real
photochemical behavior and drifts shot to shot.
