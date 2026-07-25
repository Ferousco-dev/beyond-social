# prompts/ - authored knowledge base

The version-controlled source of truth for the Prompt Intelligence System. Read
[ARCHITECTURE.md](ARCHITECTURE.md) first for the full design.

Everything here is **human-authored and PR-reviewed**. The engine
(`@beyond-social/prompt-engine`) ingests these files into chunks + embeddings;
derived and runtime data never live here (see the note in ARCHITECTURE).

## Layout

| Folder                                                    | Holds                                                                       | Kind            |
| --------------------------------------------------------- | --------------------------------------------------------------------------- | --------------- |
| `system/`                                                 | Base system layers: persona, guardrails, output contracts                   | authored        |
| `templates/`                                              | Recipes - versioned composition strategies (JSON)                           | authored        |
| `design-rules/`                                           | Design principles and UX heuristics                                         | authored chunks |
| `typography/`                                             | Type scales, pairing, hierarchy                                             | authored chunks |
| `color/`                                                  | Color systems, semantic tokens, contrast                                    | authored chunks |
| `motion/`                                                 | Motion principles, easing, choreography                                     | authored chunks |
| `accessibility/`                                          | WCAG, focus, keyboard, hit targets                                          | authored chunks |
| `layouts/`                                                | Section patterns: hero, pricing, empty states, onboarding                   | authored chunks |
| `components/`                                             | Component-level patterns: buttons, forms, nav                               | authored chunks |
| `branding/`                                               | Brand systems and consistency                                               | authored chunks |
| `copywriting/`                                            | Marketing copy, microcopy, conversion                                       | authored chunks |
| `examples/`                                               | Few-shot exemplars (accepted outputs)                                       | authored chunks |
| `evaluations/`                                            | Rubric + golden retrieval sets for offline eval                             | authored        |
| `retrieval/`                                              | Retrieval configuration notes                                               | authored        |
| `embeddings/` `chunks/` `memory/` `feedback/` `training/` | **Subsystem docs only.** The data lives in Postgres/pgvector, not in files. | docs            |

## Video generation domain (`video/`)

Beyond Social generates video, so the largest knowledge domain is the craft of
directing and prompting it. These chunks teach a generator to produce
senior-level, platform-native short-form video.

| Folder                  | Holds                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `video/prompting/`      | How to write video prompts: structure, specificity, image-to-video, templates, iteration |
| `video/cinematography/` | Shot sizes, composition, camera angle and lens                                           |
| `video/camera/`         | Camera movement vocabulary and motivated movement                                        |
| `video/lighting/`       | Lighting fundamentals, natural light, mood/low-key                                       |
| `video/color/`          | Color grading looks and multi-shot continuity                                            |
| `video/editing/`        | Cuts and transitions, continuity, pacing, time (slow-mo/timelapse)                       |
| `video/audio/`          | Music and mood, sound design and voiceover                                               |
| `video/narrative/`      | Story structure, show-don't-tell                                                         |
| `video/short-form/`     | The hook, retention, captions, loopability                                               |
| `video/platform/`       | Aspect ratios, per-platform playbook, duration                                           |
| `video/styles/`         | Cinematic, UGC/authentic, animation, product-hero                                        |
| `video/formats/`        | Product video, talking avatar, ad creative, explainer                                    |
| `video/quality/`        | Avoiding artifacts, character/scene consistency                                          |

This corpus is intended to be strong enough to publish as an open-source video
prompting knowledge base; hold every chunk to that bar.

## Authoring a chunk

One concept per file. Frontmatter + Markdown body:

```markdown
---
id: kebab-case-unique-id
title: Human title
category: visual-hierarchy
tags: [hierarchy, emphasis]
applicability:
  platforms: [web, mobile]
  productTypes: [landing-page]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

The claim. The rationale (the "why"). A concrete example. A counter-example.
```

`category`, `platforms`, and `productTypes` must be values from the enums in
`packages/prompt-engine/src/schema/chunk.ts`; ingestion rejects anything else.
Bump `version` when you meaningfully change a chunk. Split unrelated ideas into
separate files rather than growing one.
