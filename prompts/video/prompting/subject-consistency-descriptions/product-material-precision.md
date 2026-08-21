---
id: subject-consistency-descriptions-product-material-precision
title: Naming exact material and finish for product consistency
category: video-prompting
subcategory: subject-consistency-descriptions
tags: [product-consistency, materials, realism, product-video]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [product-video, ad-creative, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

Product identity across shots depends on naming the actual material and finish,
because material behavior under light is what a viewer unconsciously checks to
judge whether footage is real.

- Name the material precisely: brushed aluminum, not "metal"; matte-finish HDPE,
  not "plastic"; soft-touch silicone, not "rubbery."
- Describe how light behaves on that material — soft matte reflection with no
  hard specular hotspot, or a narrow bright highlight that moves with the camera
  — instead of naming a mood like "premium" or "shiny."
- Include close-range texture: fine machining lines, a slightly uneven paint
  edge, a visible parting line from the mold.
- Repeat the material phrase verbatim across every shot and every regeneration
  of that product.

Why: real materials have a fixed, physically consistent relationship between
their surface and light — a brushed metal produces a soft anisotropic streak, a
glossy plastic produces a sharp point highlight. Generic material words leave
that relationship undefined, so the model invents a different, often physically
inconsistent surface each time, which is one of the clearest CGI tells to a
viewer even if they can't name why it looks wrong.

Example: "brushed aluminum body, matte anodized finish, faint visible brush-grain
under raking light, no hard specular hotspot."

Counter-example: "shiny premium metal" — no fixed finish behavior defined, so
reflections, highlight sharpness, and even the implied metal type differ shot to
shot.
