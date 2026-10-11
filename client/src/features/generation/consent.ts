/**
 * The likeness attestation, kept out of the actions file.
 *
 * A "use server" module may only export async functions, so these constants
 * cannot live beside the actions that use them even though that is where they
 * belong conceptually. The UI needs the wording to display and the actions need
 * the version to record, so both import from here.
 */

/** Bumped with the wording below; acceptances of older versions stop counting. */
export const CONSENT_VERSION = 2;

/*
 * Version 2 broadens this from avatars to any upload of a person.
 *
 * Version 1 said "face and voice" and "speaking", which described the avatar
 * path and nothing else, so animating a photo through image-to-video was
 * covered by no attestation at all even though it produces a video of a real
 * person from their likeness. The wording now covers both, and mentions the
 * voice only as a condition, because most uploads have no voice attached.
 *
 * Bumping the version deliberately lapses acceptances of version 1: those
 * people agreed to a narrower statement than the one that now applies.
 */
export const CONSENT_STATEMENT =
  "The face I am uploading is my own, or I have the explicit permission of the person " +
  "it belongs to. I understand a video will be created from it, and that if I attach a " +
  "voice it will appear that they are speaking.";
