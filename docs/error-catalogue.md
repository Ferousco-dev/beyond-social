# CR-001: Generation error catalogue

Use these messages consistently. Each error names one recovery action. Never expose raw provider errors, IDs, storage paths, or secrets.

| Code | User-facing message | Recovery | Presentation |
| --- | --- | --- | --- |
| `GEN-001` | `Describe a video first.` | Enter a prompt. | Composer help, Send disabled. |
| `GEN-002` | `Wait for the upload to finish.` | Wait for upload. | Composer help, polite live announcement. |
| `GEN-003` | `We could not upload that file. Try again or choose another file.` | Retry or replace file. | Adjacent inline alert. |
| `GEN-004` | `That file type is not supported. Choose a supported image, video, or audio file.` | Replace file. | Adjacent inline alert. |
| `GEN-005` | `That file is too large for this type of generation.` | Choose smaller file. | Adjacent inline alert. |
| `GEN-006` | `We could not verify this image yet. Try again or choose another photo.` | Retry or replace photo. | Inline alert; chip stays removable. |
| `GEN-007` | `Add a photo and a voice clip to make a talking avatar.` | Add named inputs. | Disabled model explanation. |
| `GEN-008` | `Add at least 2 reference images to keep a subject consistent.` | Add images. | Disabled model explanation. |
| `GEN-009` | `Add a video for motion and a photo for the subject.` | Add named inputs. | Disabled model explanation. |
| `GEN-010` | `Add a video to edit or restyle.` | Add source video. | Disabled model explanation. |
| `GEN-011` | `Add a video and replacement audio to dub it.` | Add both files. | Disabled model explanation. |
| `GEN-012` | `This model needs [input]. Add it or switch models.` | Restore input or choose another model. | Blocking inline alert, Send disabled. |
| `GEN-013` | `This model is not available right now. Choose another model or use Auto.` | Change selection. | Disabled selected row and alert. |
| `GEN-014` | `You need [N] more credits for this video.` | Choose lower cost or top up. | Near price, Send disabled. |
| `GEN-015` | `Choose a model to continue.` | Select Auto or a compatible model. | Composer help, Send disabled. |
| `GEN-016` | `We could not start this video. Your credits were not charged.` | Retry. | Inline alert with retry. |
| `GEN-017` | `This video is already being prepared. Check its status instead of starting another one.` | Open existing generation. | Inline status, no retry. |
| `GEN-018` | `Generation is temporarily busy. Your video is queued.` | Wait for status. | Persistent status, polite live announcement. |
| `GEN-019` | `Your video could not be completed. Your credits have been returned.` | Adjust and retry. | Failed generation card. |
| `GEN-020` | `Your video could not be completed. We are checking whether a refund is due.` | Wait for final status. | Persistent status, no retry. |
| `GEN-021` | `Choose a ready avatar before generating.` | Choose ready avatar or wait. | Disabled model explanation. |
| `GEN-022` | `That avatar is still training. It will be usable shortly.` | Wait for ready status. | Avatar status panel. |
| `GEN-023` | `This avatar needs a completed voice setup before it can speak.` | Complete setup or choose another. | Avatar status panel. |
| `GEN-024` | `Your voice is not ready yet. Record a voice clip instead or finish voice setup.` | Record or complete enrollment. | Composer help. |
| `GEN-025` | `We need your permission to use this person in a generated video.` | Complete consent. | Blocking consent dialog. |
| `GEN-026` | `The generation service is not configured for this workspace.` | Contact workspace owner. | Inline alert only. |
| `GEN-027` | `This feature is not available yet.` | Choose a supported feature. | Disabled row; no retry. |

## Behaviour rules

- Use `role="alert"` only for a new blocking failure. Upload progress, queue state, and recovery use `aria-live="polite"`.
- Errors must state the next action; do not use generic wording such as `Something went wrong`.
- Offer retry only when the server confirms no generation was created and no credit charge is unresolved.
- Keep file-specific errors next to that file. Keep all inputs after errors unless the user removes them.
- Log the internal code, request ID, provider response category, and credit settlement state. Do not display them to users.
