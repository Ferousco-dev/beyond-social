# CR-001: Generation model picker

## Purpose

Give Creator testers a clear model choice without making a model choice necessary for their first video. The picker belongs in the existing composer and reads the active model catalogue for access, capability, and credit price.

## Entry point and default

Add a compact `Model: Auto` button before Send. Auto is the default for every new turn and selects the best compatible active model from prompt and attachments. The trigger has `aria-haspopup="dialog"`, `aria-expanded`, and accessible name `Choose generation model`.

Desktop opens an anchored dialog; mobile opens a bottom sheet. It contains a radiogroup with these sections, in order:

1. **Auto**: `Chooses the best available model from your prompt and files.` Always available and restores automatic selection.
2. **Recommended**: at most three eligible models, ranked by input fit, quality, then lower credit cost. Each row shows model, provider, a plain-language capability, required inputs if relevant, and exact credits.
3. **Advanced**: every other active, plan-eligible model. Incompatible models remain visible but disabled with a specific reason. Models unavailable to the plan are omitted.

Each option has `role="radio"`, selected state visible and exposed with `aria-checked`, and a complete accessible name including cost. Arrow keys move between options; Space and Enter select; Escape closes and restores focus to the trigger. Focus stays in the open dialog.

When Auto can determine a likely result, display `Likely choice: [model], [cost] credits.` beneath its row. This is an expectation, not a guarantee.

## Input compatibility

| Capability | Required | Optional | Missing or incompatible-state copy |
| --- | --- | --- | --- |
| Text to video | Prompt | Photos | `Add a description to generate a video.` |
| Image to video | 1 photo | Prompt | `Add a photo to animate it.` |
| Reference-to-video / consistency | 2+ reference photos | Prompt | `Add at least 2 reference images to keep a subject consistent.` |
| Motion control | Source video and target photo | Prompt | `Add a video for motion and a photo for the subject.` |
| Video edit or restyle | Source video | Prompt | `Add a video to edit or restyle.` |
| Talking avatar, recorded voice | Speaker photo and voice clip | Prompt | `Add a photo and a voice clip to make a talking avatar.` |
| Talking avatar, cloned voice | Speaker photo and ready cloned voice | Prompt | `Add a photo, then choose Speak this in your voice.` |
| Digital twin video | Ready saved avatar | Script | `Choose a ready avatar before generating.` |
| Video dubbing | Source video and replacement audio | Prompt optional | `Add a video and replacement audio to dub it.` |

The picker evaluates attachments live. It never silently drops a file. If a manual selection becomes invalid after an attachment is removed, keep the selection, mark it invalid, disable Send, and show `This model needs [input]. Add it or switch models.` Do not silently fall back to Auto.

## Reference video plus image flow

Rename attachment actions to `Add reference video` (`Use its movement or edit the clip`) and `Add reference images` (`Keep the person or product consistent`). With a source video plus images, show an explicit mode radiogroup above the model trigger:

- `Copy motion`, default only when the prompt asks for motion, movement, camera work, or reenactment. Requires target photo and source video.
- `Keep subject consistent`, for two or more reference images and a compatible reference-to-video model.
- `Edit video`, making the source video primary for edit/restyle models.

The mode constrains Auto and Recommended. If selected mode lacks an input, the exact missing-input copy appears and Send stays disabled. Do not generate an unrelated new clip from a source-video attachment.

## States

**Normal:** show selected model and exact price near Send. For Auto, quote a predicted cost only after compatibility resolves; otherwise say `Auto will choose after you add files.`

**Uploading/classifying:** trigger content becomes `Checking files…`; undecidable model rows are disabled; Send reads `Wait for the upload to finish`; progress is announced with `aria-live="polite"`.

**Higher-cost choice:** preserve the existing confirmation. It must show selected model, capability, exact cost, current balance, and an Auto alternative where one exists. No charge occurs before confirmation.

**Generating:** lock picker and attachments for that turn and show model, provider, and `Generating`. Preserve Stop. If work is queued, say `Queued. We will start when capacity is available.`

**Failure:** retain prompt, files, model, and mode. Show the failure directly above composer. Offer retry only after the server confirms no generation was created and no charge is unsettled.

## Mobile, visual, and accessibility rules

Below `sm`, use a full-width bottom sheet with a visible heading, 44 px row targets, collapsed Advanced section, and sticky footer showing selection, price, and `Done`. Attachment chips wrap; the trigger gets a full-width row if it cannot share space with Send without preserving 44 px hit targets. No horizontal scrolling.

Use neutral surfaces and primary blue only for selected/focus states, in line with `docs/ui.md` and `docs/color.md`. Never use colour as the sole state signal. Respect reduced motion. Long model names truncate visually but retain full accessible names. Consent remains a separate blocking step for photos depicting people. Audio/video previews need labelled playback controls and must not autoplay with sound.
