---
id: grading-looks-and-luts-lut-application-workflow
title: The correct order of operations for applying a creative LUT
category: color-grading
subcategory: grading-looks-and-luts
tags: [lut, workflow, log-footage, color-pipeline]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative, short-form-video]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

A creative LUT is a fixed transform built for one specific input condition,
usually a log or flat profile after a primary correction — not a first step
and not a full pipeline on its own. Getting the order wrong breaks the LUT
regardless of how good it is.

The recipe:

- Correct exposure and white balance on the flat or log source first — a normalizing pass.
- Apply the creative LUT second, as a stylization layer, not a correction layer.
- Do targeted secondaries — skin protection, sky, product-color accuracy — on top of the LUT.
- Check the result in the actual delivery color space; a LUT built for
  Rec.709 delivery clips or washes out if reinterpreted elsewhere.

Why: a LUT is a baked 3D transform tuned for one input condition. Feeding it
inconsistently exposed or white-balanced source from shot to shot makes the
identical LUT produce visibly different results across a sequence — footage
ends up wearing an ill-fitting filter instead of a consistent grade.

Example: "normalize exposure and white balance on the flat source, apply the
film-emulation LUT as the stylization pass, then key and protect skin."

Counter-example: applying the creative LUT directly to unbalanced,
inconsistently exposed source clips — same LUT, visibly different results
shot to shot, breaking continuity.
