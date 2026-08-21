---
id: onboarding-and-empty-state-copy-step-naming-mental-model
title: Onboarding wizard step names teach the product's structure, not the form's structure
category: copywriting
subcategory: onboarding-and-empty-state-copy
tags: [onboarding, wizard, information-architecture, mental-model]
applicability:
  platforms: [web, mobile]
  productTypes: [onboarding, saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

The labels on a multi-step onboarding wizard double as the user's first
lesson in how the product itself is organized, so they should mirror the
product's actual object model, brand, avatar, script, shots, rather than
generic form-section names.

- Name each step after the product object it configures, using the exact term
  used elsewhere in the product, "Avatar" not "Personalize," so vocabulary
  transfers instead of resetting at every screen.
- Order steps in the sequence the underlying pipeline actually needs, not the
  order that's easiest to build. If voice depends on the avatar being set,
  voice comes second.
- State what each step produces, visible in the step list itself, "3. Shots,
  pick 2-3 scenes," so a user can preview the whole path's length and content
  before starting.
- Let a step be skipped with a stated default when a sensible one exists, and
  name that default: "Skip, we'll use a neutral voice."
- Never rename the same object across the wizard and the main product,
  "Persona" in onboarding, "Avatar" in the dashboard. That mismatch forces the
  user to relearn the term.

Why: a wizard is often the only place a new user sees the product's full
object model laid out in sequence. Step names that match the product's real
vocabulary give the user a map they can reuse immediately after onboarding
ends, while generic or inconsistent names have to be relearned inside the
actual product.

Example: "1. Brand  2. Avatar  3. Voice  4. First script," each step
subtitled by what it configures.
Counter-example: "1. Getting Started  2. Personalization  3. Preferences  4.
Finish," generic wizard-framework labels that map to nothing the user will see
again by name inside the product.
