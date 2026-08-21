---
id: testimonial-before-after-unboxing-tutorial-tutorial-step-decomposition-single-action-per-clip
title: Decompose each step into its own single-action generated clip
category: video-pattern
subcategory: tutorial
tags: [tutorial, generation, shot-list, decomposition]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, explainer, product-video]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Generated video degrades as instructed actions stack inside one clip, so a multi-step tutorial should be planned as a shot list of separate short generations, one demonstrated action per clip, and assembled by editing rather than asked for as one continuous demonstration.

The decomposition rule:

- Write the tutorial as a numbered list of physical actions before writing any prompt; each list item becomes exactly one generation, not one sentence inside a longer generation.
- Keep each clip to a single, simple motion (pour, fold, twist, press) at a duration the model renders cleanly, rather than compressing two actions into one prompt to save a generation.
- Carry a fixed identity and environment description across every clip in the sequence (same hands, same surface, same light) so the cuts read as one continuous session even though each was generated separately.
- End each clip on the completed state of that action and start the next clip from that same completed state, so the edit point is a clean action-to-action match rather than a jarring reset.
- Reserve a slightly longer generation only for the single hardest-to-render step, and keep every other step short and simple; spreading render risk evenly across steps of very different difficulty wastes budget on the easy ones.

Why: this is a direct consequence of how generation quality degrades with instruction complexity and duration; a tutorial's core structure, sequential discrete actions, happens to map exactly onto the shot lengths and single-action prompts that generate most reliably, so treating the shot list as the generation plan turns a technical constraint into the format's natural structure.

Example: step 3 of a recipe tutorial, "whisk the eggs," generated as its own 3-second clip ending on fully-whisked eggs, cut directly into step 4's clip which opens already holding the whisked-egg bowl.

Counter-example: one prompt asking for "cracking the eggs, whisking them, then folding in the flour" as a single continuous generation, stacking three distinct hand actions into one clip and inheriting the artifact risk of all three at once.
