---
id: character-consistency-across-shots-negative-prompting-drift
title: Use exclusion language to close off the model's easiest drift paths
category: video-quality
subcategory: character-consistency
tags: [character-consistency, negative-prompting, prompting, quality-control]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.83
---

Positive description alone tells the model what to include; it doesn't rule out the
specific substitutions that tend to happen in practice. Once you've watched a
character drift on a project, that specific failure mode is worth excluding
explicitly on every future shot in that sequence, not just re-described positively.

The recipe:

- After the first drifted shot in a sequence, note exactly what changed (hair went
  lighter, face got rounder, eyes changed color) and add a targeted exclusion for
  that specific attribute rather than a generic "keep consistent" instruction, which
  carries little information.
- Keep exclusions specific and short: "not blonde, not wavy" is more useful than
  "no inconsistencies," which the model cannot act on directly.
- Use exclusion language for the failure mode actually observed, not preemptively for
  everything that could theoretically go wrong; an overloaded exclusion list dilutes
  attention on the positive identity clause.
- Reserve exclusion prompting as a second layer on top of the locked descriptor block
  and reference image, not as a replacement for either; it closes gaps those two
  leave open, it does not do the anchoring work itself.
- Retire an exclusion once a batch stops showing that failure mode with a new
  reference or setup, since stale exclusions add prompt length without adding value.

Why: a generation model's likely failure modes are somewhat predictable once
observed (it tends to lighten dark hair, round out angular faces, or shift eye color
toward brown, depending on the base model's training bias), and naming the specific
observed substitution gives the sampler a concrete boundary instead of an abstract
consistency request it has no mechanism to fulfill.

Example: "warm chestnut brown hair, center part -- not blonde, not straight" added
after a batch showed the hair lightening and losing its wave.
Counter-example: adding a vague "make sure the character stays consistent across all
shots" instruction with no specific attribute named, which changes nothing in the
output.
