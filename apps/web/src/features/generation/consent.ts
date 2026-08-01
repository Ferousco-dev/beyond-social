/**
 * The likeness attestation, kept out of the actions file.
 *
 * A "use server" module may only export async functions, so these constants
 * cannot live beside the actions that use them even though that is where they
 * belong conceptually. The UI needs the wording to display and the actions need
 * the version to record, so both import from here.
 */

/** Bumped with the wording below; acceptances of older versions stop counting. */
export const CONSENT_VERSION = 1;

export const CONSENT_STATEMENT =
  "The face and voice I am uploading are my own, or I have the explicit permission " +
  "of the person they belong to. I understand a video will be created of them speaking.";
