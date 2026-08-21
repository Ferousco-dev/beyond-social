---
id: prompt-length-and-density-shot-list-parity
title: Matching density across a cut sequence
category: video-prompting
subcategory: prompt-length-and-density
tags: [prompt-length, density, continuity, shot-list]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

When generating a sequence of shots meant to cut together, each prompt needs
matching density, not just matching content, or the cut will stutter visually
even when every individual shot looks fine on its own.

- Set a target clause count for the sequence and hold every shot in it to
  roughly that budget.
- Keep the same clause order across shots (subject and action, framing,
  light, lens) so continuity cues land in the same place every time.
- Restate unchanging facts explicitly in every shot: same wardrobe, same
  light source, same lens. Do not assume continuity carries forward, because
  separate generations do not share memory.
- If one shot in a sequence is much denser than its neighbors, that
  inconsistency is a common cause of a mismatched grade or mismatched motion
  right where the cut lands.

Why: each shot is generated independently, so any property not restated is
free to drift. Uneven density across a sequence usually means some shots got
tightly pinned continuity details and others did not, and the seams from that
show up exactly at the cut, which is the moment continuity errors are most
visible to a viewer.

Example: three shots in one scene each opening with "Same kitchen, same
overcast window light, same actor in a grey sweater," followed by
shot-specific action and framing.
Counter-example: shot one is a single dense paragraph pinning light, wardrobe,
and lens; shot three is a five-word prompt. Shot three drifts in color
temperature and framing because nothing carried its continuity forward.
