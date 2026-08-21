---
id: semantic-token-systems-info-vs-primary-separation
title: Give info its own token distinct from the primary accent
category: color-system
subcategory: hue-mapping
tags: [info, primary-accent, hue-collision, semantic-color]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, marketing-site]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Info and primary are both commonly blue, which is the most frequent semantic
collision in token systems: an info banner and a primary button end up
indistinguishable, so users start treating informational callouts as
clickable.

- If the brand primary is blue, shift info to a visibly different lightness
  or a slightly different hue, not just a lower-opacity version of the same
  blue.
- A reliable pattern: keep primary saturated and mid-tone for actionability,
  and make info cooler, lighter, or more desaturated so it reads as
  "ambient," not "actionable."
- Never place an info-colored element next to interactive controls without a
  clear shape difference (banner vs. button), color proximity alone is not
  enough disambiguation.
- Run every screen that mixes info banners and primary buttons through a
  quick squint test, blur the screen slightly; if the info banner still reads
  as a call to action, the hues are too close.

Why: color is a stronger interactivity cue than most teams give it credit
for, users learn "blue means clickable" from every other product they use,
not just this one. When info and primary share a hue, that learned
expectation misfires on static content, producing dead clicks and a subtle
erosion of trust in the button system generally.

Example: primary `#0066FF` for buttons and links, info `#2563EB` on a
markedly lighter `#EAF2FF` tint background with no button-like shape, so the
two never appear in the same visual register.
Counter-example: an info banner styled with the exact same solid `#0066FF`
fill and rounded-rectangle shape as the primary CTA button, so users tap it
expecting an action.
