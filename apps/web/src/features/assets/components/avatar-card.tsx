"use client";

import { Check, Loader2, Trash2, UserRound } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { useConfirm } from "@/components/ui/use-confirm";
import { CONSENT_STATEMENT } from "@/features/generation/consent";
import { recordLikenessConsent } from "@/features/generation/avatar-actions";
import { type BrandAsset } from "@/lib/assets/brand";

import { removeBrandAsset, saveBrandAsset } from "../actions";
import { usePictureUpload } from "../hooks/use-picture-upload";
import { MakeVideoButton } from "./make-video-button";

/**
 * The saved likeness.
 *
 * One picture, replaceable, deletable. Keeping a face is a further promise than
 * sending one for a single render, so the attestation is asked for here rather
 * than assumed from whatever was agreed to in a thread, and it is asked before
 * the picture is kept rather than after.
 */
export function AvatarCard({ avatar }: { avatar: BrandAsset | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = usePictureUpload();
  const [message, setMessage] = useState<string | null>(null);
  const [askConsent, setAskConsent] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();
  /*
   * Removal clears the picture immediately and puts it back if the server
   * refuses. Uploading still waits, because there is nothing to show until the
   * bytes have landed and the attestation may still be needed.
   */
  const [removed, setRemoved] = useState(false);
  const shown = removed ? null : avatar;
  const busy = uploading || pending;

  function keep(path: string) {
    startTransition(async () => {
      const result = await saveBrandAsset({ kind: "avatar", path });

      if (result.status === "consent") {
        // Held rather than discarded: the picture is already in storage, and
        // making somebody choose the file again after agreeing is a punishment
        // for reading the statement.
        setAskConsent(path);
        return;
      }

      /*
       * A save that lands after a removal has to clear it, or `shown` stays
       * forced to null forever: `avatar` is a server prop that only refreshes
       * on the next navigation, so removing a picture and uploading a new one
       * in the same visit left the card showing empty with a real picture
       * saved behind it, and no way to see it without a reload.
       */
      if (result.status === "ok") setRemoved(false);
      setMessage(result.status === "ok" ? null : "Could not save that picture.");
    });
  }

  async function choose(file: File | undefined) {
    if (!file) return;
    setMessage(null);

    const path = await upload(file);
    if (path === null) {
      setMessage("That picture could not be uploaded.");
      return;
    }
    keep(path);
  }

  function agree() {
    const path = askConsent;
    if (path === null) return;

    startTransition(async () => {
      const consent = await recordLikenessConsent();
      if (consent.status !== "ok") {
        setMessage("Could not record that agreement.");
        return;
      }
      setAskConsent(null);
      keep(path);
    });
  }

  return (
    <section className="h-full rounded-2xl border border-hairline bg-paper p-6">
      {dialog}
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <UserRound className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-sm font-semibold text-ink">You</h2>
          {shown ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <Check className="size-2.5" aria-hidden />
              Saved
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        A photo of yourself, kept so your videos can be of you without uploading it every time. Face
        forward, well lit, nothing covering it.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-hairline bg-cloud">
          {shown?.url ? (
            // Plain img: these are signed, short-lived URLs the image optimiser
            // cannot be configured for.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown.url} alt="Your saved avatar" className="size-full object-cover" />
          ) : (
            <UserRound className="size-9 text-ink-soft" aria-hidden />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => void choose(event.target.files?.[0])}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-ink px-4 text-xs font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            {shown ? "Replace photo" : "Upload a photo"}
          </button>

          {shown ? (
            <MakeVideoButton
              asset={shown}
              className="h-9 border border-hairline px-4 text-ink hover:bg-cloud"
            >
              Make a video of you
            </MakeVideoButton>
          ) : null}

          {shown ? (
            <button
              type="button"
              onClick={() => {
                const target = shown;
                // Asked for: the file is deleted from storage, so restoring it
                // means finding the original photo and uploading it again.
                void (async () => {
                  const agreed = await confirm({
                    title: "Remove your photo?",
                    description:
                      "It is deleted for good. Putting it back means uploading the picture again and agreeing to the likeness statement.",
                    confirmLabel: "Remove it",
                    tone: "destructive",
                  });
                  if (!agreed) return;

                  setRemoved(true);
                  setMessage(null);
                  void removeBrandAsset({ id: target.id }).then((result) => {
                    if (result.status === "ok") return;
                    setRemoved(false);
                    setMessage("Could not remove that picture.");
                  });
                })();
              }}
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-hairline px-4 text-xs font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Remove
            </button>
          ) : null}
        </div>
      </div>

      {askConsent !== null ? (
        <div className="mt-5 rounded-xl border border-hairline bg-cloud p-4">
          <p className="text-xs leading-relaxed text-ink">{CONSENT_STATEMENT}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={agree}
              disabled={pending}
              className="inline-flex h-9 cursor-pointer items-center rounded-full bg-ink px-4 text-xs font-medium text-paper transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40"
            >
              I agree
            </button>
            <button
              type="button"
              onClick={() => setAskConsent(null)}
              className="inline-flex h-9 cursor-pointer items-center rounded-full px-4 text-xs font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {message}
        </p>
      ) : null}
    </section>
  );
}
