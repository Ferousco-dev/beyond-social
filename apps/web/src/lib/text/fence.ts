/**
 * Fencing untrusted text before it goes into a prompt.
 *
 * A fence like `<idea>...</idea>` only holds if the content between the tags
 * cannot itself contain the closing tag. Somebody typing a literal `</idea>`
 * into their idea closes the fence early, and everything they write after it
 * lands in the position a model reads as ours rather than theirs, exactly the
 * boundary the fence exists to hold.
 *
 * `<` is replaced with a full-width lookalike, which defeats every tag this
 * codebase fences with (`</idea>`, `</post>`, `</analysis>`, anything else
 * shaped like it) without visibly mangling ordinary text: nobody writing a
 * video idea is relying on a literal `<` to mean anything, and a model reading
 * the fullwidth character back reads it as the character it looks like, not as
 * markup.
 */
export function fenceSafe(text: string): string {
  return text.replace(/</g, "＜");
}
