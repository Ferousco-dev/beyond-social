---
id: subject-consistency-descriptions-negative-specification
title: Naming the specific failure a subject is prone to
category: video-prompting
subcategory: subject-consistency-descriptions
tags: [subject-consistency, negative-prompting, product-consistency, continuity]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.84
---

For a subject prone to a known failure mode, stating what must not appear or
change is as load-bearing as stating what should, especially for products,
logos, and other text-bearing elements.

- Name the specific failure the subject is actually prone to — the logo gets
  re-lettered, the cap color shifts to glossy, an extra button appears on the
  jacket — based on what you've actually observed, not a generic worry list.
- Keep each negative statement short, singular, and tied to a real observed
  failure.
- Place negative statements after the positive identity description; they
  supplement it, they don't substitute for it.
- Drop a negative once that failure stops recurring across regenerations —
  stale negatives just add noise the model has to parse.

Why: video models have specific, learnable failure tendencies — relabeling
text, duplicating small objects, drifting a color toward a more common variant
in their training data. Naming the exact tendency you're fighting is far more
effective than assuming the positive description alone is unambiguous enough to
prevent it.

Example: "the label reads exactly \"NORTH FIELD\"; do not alter or duplicate the
text; cap stays matte black, not glossy."

Counter-example: a blanket "no artifacts, no errors, high quality" appended to
every prompt — it names no actual failure, so it gives the model nothing
specific to correct for.
