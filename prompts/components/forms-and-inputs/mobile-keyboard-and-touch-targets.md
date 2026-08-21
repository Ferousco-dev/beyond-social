---
id: forms-and-inputs-mobile-keyboard-and-touch-targets
title: Mobile keyboard types and touch target sizing
category: component
subcategory: forms-and-inputs
tags: [forms, mobile, keyboard, touch-targets]
applicability:
  platforms: [mobile, ios, android]
  productTypes: [mobile-app, onboarding, e-commerce, auth]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

On a touchscreen, the wrong keyboard type or an undersized tap target turns a
five-second field into a fumbling, error-prone one, and both are fixable with
attributes the OS already supports.

The recipe:

- Set inputmode/type to match the data: `numeric` for a PIN or quantity,
  `tel` for phone, `email` for email, `decimal` for currency — each swaps in a
  keyboard layout that removes irrelevant keys instead of forcing a hunt
  across a full QWERTY layout.
- Size every tappable input, checkbox, radio, and button to at least 44x44pt
  (iOS) / 48x48dp (Android), including the invisible padding around a small
  visual element like a checkbox square.
- Space adjacent tap targets by at least 8pt so a slightly-off tap doesn't
  land on the neighboring control, especially in a list of checkboxes or a
  row of radio buttons.
- Avoid `autofocus` on the first field of a page that loads with the keyboard
  already open — it covers half the screen before the user has had a chance
  to see what the page even is.
- Disable autocorrect and autocapitalize on fields where they actively harm
  input (email, username, code fields) since a corrected email address is a
  silently broken one.

Why: a touch target and a keyboard layout are both physical-world constraints
disguised as software settings — a fingertip is roughly 8-10mm wide regardless
of screen resolution, and a keyboard with irrelevant keys costs real seconds
of visual search on every single field, multiplied across the whole form.

Example: a quantity stepper field set to `inputmode="numeric"`, its +/- buttons
each 48dp square with 8dp of gap between them and the number field.

Counter-example: a phone number field using the default text keyboard, forcing
the user to tap a "123" toggle key before every phone number they enter.
