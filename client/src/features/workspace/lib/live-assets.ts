import { type ComposerDraft } from "@/features/dashboard/hooks/use-composer-draft";
import { type ChatMessage } from "@/lib/chat/thread";

import { type PickerAsset } from "../components/asset-picker";
import { type CanvasTake } from "../components/workspace-canvas";

/** Renders and takes from live messages, so new videos appear without a reload. */
export function takesFromMessages(
  messages: readonly ChatMessage[],
  query: string,
  demoTakes: readonly CanvasTake[],
): CanvasTake[] {
  const needle = query.trim().toLowerCase();
  const takes: CanvasTake[] = [];
  for (const message of messages) {
    const draft = message.draft;
    if (!draft) continue;
    if (draft.status !== "ready" && draft.status !== "generating") continue;
    const label = message.content.slice(0, 48) || "Take";
    if (needle !== "" && !label.toLowerCase().includes(needle)) continue;
    takes.push({ id: draft.generationId, url: draft.resultUrl, label });
  }
  for (const take of demoTakes) {
    if (needle !== "" && !take.label.toLowerCase().includes(needle)) continue;
    takes.push(take);
  }
  return takes;
}

/** Whatever is attached in the composer right now, visible before it is sent. */
export function draftPickerAssets(draft: ComposerDraft): PickerAsset[] {
  const list: PickerAsset[] = draft.photos.map((photo, index) => ({
    id: photo.id,
    label: `Attached photo ${index + 1}`,
    url: photo.url,
    kind: "image",
  }));
  if (draft.voice) {
    list.push({
      id: `voice-${draft.voice.path}`,
      label: draft.voice.name === "" ? "Attached voice" : draft.voice.name,
      url: draft.voice.url,
      kind: "voice",
    });
  }
  if (draft.footage) {
    list.push({
      id: `footage-${draft.footage.path}`,
      label: draft.footage.name === "" ? "Attached footage" : draft.footage.name,
      url: null,
      kind: "video",
    });
  }
  return list;
}

/** Everything already sent or rendered in this thread: photos, clips, renders. */
export function messagePickerAssets(messages: readonly ChatMessage[]): PickerAsset[] {
  const list: PickerAsset[] = [];
  for (const message of messages) {
    for (const attachment of message.attachments) {
      if (!attachment.url) continue;
      list.push({
        id: `sent-${attachment.path}`,
        label: attachment.kind === "audio" ? "Sent voice" : "Sent photo",
        url: attachment.url,
        kind: attachment.kind === "audio" ? "voice" : "image",
      });
    }
    const draft = message.draft;
    if (draft?.resultUrl) {
      list.push({
        id: draft.generationId,
        label: message.content.slice(0, 48) || "Take",
        url: draft.resultUrl,
        kind: "video",
      });
    }
  }
  return list;
}

/** First list wins on duplicate ids: live items outrank the library. */
export function mergeAssets(...lists: readonly (readonly PickerAsset[])[]): PickerAsset[] {
  const seen = new Set<string>();
  const merged: PickerAsset[] = [];
  for (const list of lists) {
    for (const asset of list) {
      if (seen.has(asset.id)) continue;
      seen.add(asset.id);
      merged.push(asset);
    }
  }
  return merged;
}
