"use client";

import type { AssetGroupDetail } from "@/lib/go-api/schemas";

type SlotView = NonNullable<AssetGroupDetail["face_view"]>;

const SLOTS = [
  { id: "face", label: "Face", accept: "image/*,video/*", view: "face_view" },
  { id: "voice", label: "Voice", accept: "audio/*", view: "voice_view" },
  { id: "product", label: "Product", accept: "image/*,video/*", view: "product_view" },
  { id: "environment", label: "Environment", accept: "image/*,video/*", view: "environment_view" },
] as const;

export type SlotId = (typeof SLOTS)[number]["id"];
export { SLOTS };

/** One fixed slot: preview, upload to fill, consent for face and voice. */
export function SlotCard({
  slot,
  group,
  busy,
  onUpload,
  onConsent,
}: {
  slot: (typeof SLOTS)[number];
  group: AssetGroupDetail;
  busy: boolean;
  onUpload: (slot: SlotId, file: File) => void;
  onConsent: (slot: SlotId) => void;
}) {
  const view = group[slot.view];
  const consented =
    slot.id === "face" ? group.face_consent_at !== null : slot.id === "voice" ? group.voice_consent_at !== null : true;

  return (
    <li className="rounded-2xl border border-hairline bg-paper p-4">
      <p className="text-sm font-semibold text-ink">{slot.label}</p>
      {view ? (
        view.kind === "audio" ? (
          <span className="mt-2 block">
            <Preview view={view} />
          </span>
        ) : (
          <span className="mt-2 block aspect-video w-full overflow-hidden rounded-lg bg-cloud">
            <Preview view={view} />
          </span>
        )
      ) : null}
      {view ? (
        <p className="mt-1 truncate text-xs text-ink-soft">{view.name !== "" ? view.name : "Attached"}</p>
      ) : (
        <p className="mt-1 text-xs text-ink-soft">Empty</p>
      )}
      <label className="mt-3 inline-flex min-h-10 cursor-pointer items-center rounded-[10px] border border-hairline px-3 text-sm text-ink transition-colors hover:bg-cloud">
        {view ? "Replace" : "Upload"}
        <input
          type="file"
          accept={slot.accept}
          className="hidden"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onUpload(slot.id, file);
          }}
        />
      </label>
      {(slot.id === "face" || slot.id === "voice") && view ? (
        consented ? (
          <p className="mt-2 text-xs font-medium text-success">Consent recorded</p>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => onConsent(slot.id)}
            className="mt-2 inline-flex min-h-10 cursor-pointer items-center rounded-[10px] border border-hairline px-3 text-xs font-medium text-ink transition-colors hover:bg-cloud disabled:opacity-40"
          >
            I confirm this {slot.id} is mine to clone
          </button>
        )
      ) : null}
    </li>
  );
}

/** The file itself: image, video, or audio player. */
export function Preview({ view }: { view: SlotView }) {
  if (view.kind === "audio") {
    return <audio src={view.url} controls preload="metadata" className="w-full" />;
  }
  if (view.kind === "video") {
    return <video src={view.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={view.url} alt={view.name} loading="lazy" className="h-full w-full object-cover" />
  );
}
