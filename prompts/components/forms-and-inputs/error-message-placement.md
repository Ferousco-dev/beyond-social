---
id: forms-and-inputs-error-message-placement
title: Error message placement and wording
category: component
subcategory: forms-and-inputs
tags: [forms, errors, copywriting, accessibility]
applicability:
  platforms: [web, mobile]
  productTypes: [landing-page, saas-dashboard, marketing-site, auth, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.9
---

An error message only works if the eye lands on it without hunting, and if the
words tell the user what to do next rather than what went wrong in abstract
terms.

The recipe:

- Place the message directly below the specific field it belongs to, never in a
  single banner at the top of the form that lists every problem at once.
- Keep the field's layout height reserved for the error (or let it push content
  down consistently) so the message appearing doesn't cause a layout jump the
  user has to re-orient around.
- Write in the imperative, naming the fix: "Enter a valid email address" beats
  "Invalid input."
- Pair the message with a non-color signal (icon, border, bold text) so it
  doesn't rely on red alone.
- Associate the message to the input programmatically (aria-describedby) so
  screen reader users hear it at the moment of focus, not just sighted users.

Why: a top-of-form error summary forces the user to hold a mental map of which
message maps to which field while scrolling back through the form, which is
exactly the kind of translation work good design removes. Field-adjacent,
specific, instructional copy turns an error from a verdict into a next step.

Example: "Password needs at least 8 characters" shown directly under the
password field, red text plus a small warning icon, referenced via
aria-describedby.

Counter-example: a red bar at the top reading "3 errors found. Please fix and
resubmit." with no per-field indication of which three fields are wrong.
