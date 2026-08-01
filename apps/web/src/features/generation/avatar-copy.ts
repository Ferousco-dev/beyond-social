/**
 * Copy shared between the avatar action and the composer.
 *
 * Its own module because a `"use server"` file may only export async
 * functions, and the client needs the same string the server persists: the
 * optimistic reply and the stored one being different words is the kind of
 * thing that only shows up as a flicker on reload.
 */
export const AVATAR_REPLY = "Making a video of you saying that.";
