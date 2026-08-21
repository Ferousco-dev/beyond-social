---
id: jump-cuts-and-energy-continuity-drift-ai-tell
title: Continuity drift that reads as an AI tell, not an edit
category: editing
subcategory: generation-technique
tags: [jump-cut, continuity, ai-look, generation]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

In AI-generated jump-cut sequences, continuity errors a human editor would
never let through, a hand suddenly resting on a different object, a light
source flipping direction, a background element sliding, are the fastest way
a clip reads as synthetic. They violate physical persistence, not just time.

- Lock a continuity anchor into every clip's prompt: same light source
  direction and color temperature, same key props in the same position, same
  wardrobe detail described identically.
- Re-describe the environment identically across clips meant to jump-cut
  together, same window, same wall, same background objects, instead of
  letting each generation invent its own version of "a kitchen."
- If a prop must move between cuts, make the movement the point of the cut,
  someone picks it up, rather than an unexplained jump in its position.
- Check generated pairs for background drift, a chair shifted, a light
  changed color, before treating them as a usable pair; regenerate rather
  than editing around it.

Why: a real jump cut only removes time, not physics. Furniture, light, and
shadows stay put because they never moved. When a generator resets those
elements between clips it produces an error the audience's object-permanence
sense catches almost instantly, well before anyone could articulate why.

Example: "same window camera-left, same warm 3200K practical lamp on the
desk, same mug on the left side of frame, held across both clips."

Counter-example: two clips of the "same" speaker cut together where the lamp
has switched sides of the desk and the mug has vanished. Technically a jump
cut, but it reads as a generation glitch, not an edit.
