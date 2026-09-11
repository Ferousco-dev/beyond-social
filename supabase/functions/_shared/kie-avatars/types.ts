/**
 * What every avatar model builder is given.
 *
 * Separate from the video family's `MarketRequest` because an avatar starts
 * from an image plus an audio track rather than from footage or a shot list.
 * The output shape (`MarketInput`) is shared, because every kie market model
 * has the same `input` container regardless of family.
 */

export interface AvatarRequest {
  readonly imageUrl: string;
  readonly audioUrl: string;
  readonly prompt: string;
  /**
   * "480p" | "720p" | "1080p". This is the caller's spelling and every builder
   * translates it into whatever the provider's own field is called and whatever
   * values it accepts. Sending "480p" to omnihuman as `resolution` looks right
   * and drops silently: the model reads `output_resolution` with `"720"` or
   * `"1080"` and no `p`.
   */
  readonly resolution: string;
}
