---
id: modals-and-overlays-multi-step-wizard-modal
title: Multi-step flows inside a modal
category: component
subcategory: modals-and-overlays
tags: [modal, wizard, multi-step, progress]
applicability:
  platforms: [web, mobile]
  productTypes: [saas-dashboard, onboarding, e-commerce]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

A multi-step modal should show explicit progress and let the user step backward without losing entered data, or it becomes a maze that punishes exploration.

- Show a step indicator, whether numbered dots, labeled steps, or a progress bar, that states both current position and total step count, such as "Step 2 of 4," not an ambiguous dot pattern with no labels.
- Preserve field values across back-and-forward navigation within the flow; re-rendering a blank step when the user goes back is the single most common wizard-modal complaint.
- Keep the modal's outer size fixed across steps so the panel doesn't jump or resize as content changes; resize the internal content area, not the chrome.
- Put "Back" on the left and "Next" or "Continue" on the right, consistently, and disable "Next" with a visible reason rather than letting an invalid step pass silently.
- Cap it at 3-5 steps; past that, a dedicated full page with persistent navigation is almost always the better container than a modal.

Why: A wizard modal asks the user to trust a process they can't fully see the end of; visible progress and safe backward navigation are what make that trust reasonable. Without them, users either abandon partway through, unsure how much is left, or become afraid to go back and check something, because going back has already burned their inputs once.

Example: "Step 2 of 3, 'Payment details,' Back and Continue buttons, prior step's values still populated when returning."
Counter-example: "A 6-step modal with unlabeled dots and fields that reset on Back." Users can't estimate remaining effort and lose trust in the Back button within the first step.
