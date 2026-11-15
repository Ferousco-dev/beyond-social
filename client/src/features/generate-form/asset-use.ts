/** What the form needs to know about a saved asset to say whether it will be used. */
export interface UsableAsset {
  readonly id: string;
  readonly label: string;
  readonly file_kind: string;
}

export interface AssetChoices {
  readonly speakerMode: "single" | "conversation";
  readonly faceAssetId: string;
  readonly voiceAssetId: string;
  readonly productAssetId: string;
  readonly environmentAssetId: string;
}

/**
 * Plain sentences for every picked asset that will not appear in the video.
 * Quiet failures are worse than a refusal: someone who picks a product and a
 * face should hear that only one of them can start the clip.
 */
export function unusedAssetNotes(choices: AssetChoices, assets: readonly UsableAsset[]): string[] {
  const find = (id: string): UsableAsset | undefined => (id === "" ? undefined : assets.find((asset) => asset.id === id));
  const face = find(choices.faceAssetId);
  const product = find(choices.productAssetId);
  const environment = find(choices.environmentAssetId);
  const notes: string[] = [];

  if (choices.speakerMode === "conversation" || (face !== undefined && choices.voiceAssetId !== "")) {
    // A talking video is the face and the recording, nothing else.
    const what = choices.speakerMode === "conversation" ? "a conversation" : "a talking video";
    for (const [asset, noun] of [[product, "product"], [environment, "environment"]] as const) {
      if (asset) notes.push(`The ${noun} "${asset.label}" is not used in ${what}. It is made from the face and the voice recording only.`);
    }
    return notes;
  }

  // A clip starts from one picture: the face, then the product, then the environment.
  const picked = [face, product, environment].filter((asset): asset is UsableAsset => asset !== undefined);
  const pictures = picked.filter((asset) => asset.file_kind === "image");
  for (const asset of picked) {
    if (asset.file_kind !== "image") notes.push(`"${asset.label}" is a ${asset.file_kind}, and only pictures can be used. It will not appear in the video.`);
  }
  const [first, ...rest] = pictures;
  if (first && rest.length > 0) {
    const others = rest.map((asset) => `"${asset.label}"`).join(" and ");
    notes.push(`Only one picture can start a clip. "${first.label}" will be used, and ${others} will not appear.`);
  }
  return notes;
}
