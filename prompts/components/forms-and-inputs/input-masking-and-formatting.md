---
id: forms-and-inputs-input-masking-and-formatting
title: Input masking and live formatting
category: component
subcategory: forms-and-inputs
tags: [forms, masking, formatting, input]
applicability:
  platforms: [web, mobile]
  productTypes: [e-commerce, saas-dashboard, onboarding]
  styles: []
source: authored
version: 1
priorQuality: 0.88
---

Structured data like phone numbers, card numbers, and dates benefits from
formatting as the user types, but the mask has to help, not fight, the act of
typing or correcting a mistake.

The recipe:

- Auto-insert separators the user would otherwise have to type themselves
  (dashes in a card number, parentheses and a dash in a US phone number) but
  never require the user to type the separator character themselves.
- Keep the cursor position correct after auto-insertion — inserting a space
  should not strand the cursor before the space, forcing the user to
  re-navigate.
- Allow backspace to delete through a formatting character in one keystroke
  rather than requiring two presses to remove a digit next to a dash.
- Restrict keystrokes to valid characters at the OS/input level (numeric
  keypad for a card number) rather than accepting anything and validating
  after the fact.
- Show the format as ghost text or a hint below the field before the user
  starts typing ("MM/DD/YYYY") so the mask isn't a surprise mid-entry.

Why: a mask that fights cursor position or backspace behavior is more work
than typing the raw digits unformatted would have been, which defeats the
entire point of adding the mask. Good masking is invisible: the user just
types digits and correct-looking output appears without extra taps.

Example: a card number field that renders "4242 4242 4242 4242" as digits are
typed, with backspace removing one digit (and its adjacent space) per press.

Counter-example: a phone field that requires the user to manually type
"(", then digits, then ")", then a space, with no auto-formatting at all,
turning a 10-digit entry into a 14-keystroke ordeal.
