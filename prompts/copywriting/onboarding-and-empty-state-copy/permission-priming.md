---
id: onboarding-and-empty-state-copy-permission-priming
title: A permission request is preceded by copy that states the trade, not the ask
category: copywriting
subcategory: onboarding-and-empty-state-copy
tags: [permissions, priming, onboarding, mobile]
applicability:
  platforms: [mobile, ios, android]
  productTypes: [mobile-app, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Before any OS-level permission dialog fires, camera, photo library,
notifications, a custom screen or inline card should state exactly what the
user gets for granting it. The system dialog can only say what's being
requested, not why, and a denial there is difficult to reverse without a trip
to Settings.

- State the specific feature unlocked, not the permission name: "See camera
  roll to pick a photo for your avatar," not "Allow Photo Access."
- Time the priming screen to the moment the feature is actually needed, not at
  first app launch bundled with two other permissions at once.
- Make the trade concrete and scoped when privacy is the likely objection: "We
  only use this photo to generate your avatar, nothing is posted without your
  review."
- Let the user decline and still use the rest of the product. A permission
  that blocks all further progress if declined should be rare and clearly
  justified.
- Never mimic the system dialog's buttons or styling in the priming screen. It
  must read as the product's request, distinct from the OS prompt that
  follows.

Why: the OS permission dialog is a one-shot, low-context moment. A user who
denies it because they didn't understand the value usually won't get a second
native prompt on that permission, so nearly all the persuasion has to happen
in the screen before it, not in the dialog itself.

Example: "To generate your talking avatar, we need one photo. Tap Continue to
choose from your library." Then the system dialog fires.
Counter-example: launching straight into the OS "Allow Photo Access" dialog on
first app open, before the user has done anything that would explain why it's
needed.
