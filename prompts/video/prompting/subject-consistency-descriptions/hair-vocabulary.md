---
id: subject-consistency-descriptions-hair-vocabulary
title: Precise hair vocabulary to prevent drift and the static-hair tell
category: video-prompting
subcategory: subject-consistency-descriptions
tags: [subject-consistency, hair, realism, character-description]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, ugc, talking-avatar]
  styles: []
source: authored
version: 1
priorQuality: 0.86
---

Hair is one of the highest-variance elements in generated video, so it needs its
own locked vocabulary distinct from the rest of the identity description.

- Specify length (chin-length, shoulder-length), texture (loose waves, coarse
  curls, tight coils), part (deep side part, center part), and one flyaway or
  frizz detail.
- Use the vocabulary a hairstylist would use — S-wave, box braids, undercut —
  instead of vague praise like "nice hair" or "flowing hair."
- If the shot involves head movement, note baseline hair physics: falls forward
  when the head tilts down, swings with a half-second lag on a turn.
- Keep hair color as pigment only ("dark auburn"), leaving how it catches light
  to the shot's separate lighting instruction, not the identity block.

Why: hair has enormous geometric freedom — thousands of strands with real physics
— so under-specifying it lets the model default to smooth, static, weightless hair
that barely reacts to motion, which is one of the fastest visual tells that footage
is synthetic rather than shot on camera.

Example: "shoulder-length dark brown hair in loose S-waves, deep left side part,
a few flyaways near the temple, swings with a slight lag when she turns her head."

Counter-example: "long, flowing, beautiful hair" — no texture, no part, no physics
cue, so the model renders smooth, inert hair that doesn't move like real hair and
looks different in every regeneration.
