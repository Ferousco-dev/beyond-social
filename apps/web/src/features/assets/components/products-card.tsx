"use client";

import { Package, Plus, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { type BrandAsset } from "@/lib/assets/brand";
import { useOptimisticList } from "@/lib/hooks/use-optimistic-list";

import { removeBrandAsset, saveBrandAsset } from "../actions";
import { usePictureUpload } from "../hooks/use-picture-upload";
import { MakeVideoButton } from "./make-video-button";
import { Spinner } from "@/components/ui/spinner";

/**
 * The product shelf.
 *
 * Uncapped, unlike the avatar: a catalogue is a real thing to have, and there is
 * no reason to make somebody choose which of their products the app is allowed
 * to know about.
 *
 * A picture of a person is refused here by the action rather than by a warning,
 * because filing a face under products would route it around the likeness
 * attestation entirely.
 */
export function ProductsCard({ products }: { products: readonly BrandAsset[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = usePictureUpload();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const shelf = useOptimisticList(products);

  /*
   * Only the upload blocks. Removing is instant, because nothing about it needs
   * the server's opinion first, but adding genuinely has to wait: the bytes must
   * reach storage before there is anything to show, and the classifier can still
   * refuse a picture of a person.
   */
  const busy = uploading || pending;

  async function choose(file: File | undefined) {
    if (!file) return;
    setMessage(null);

    const path = await upload(file);
    if (path === null) {
      setMessage("That picture could not be uploaded.");
      return;
    }

    startTransition(async () => {
      // The file name is the starting label: it is usually the product name,
      // and an untitled shelf is unusable once there are more than three things
      // on it.
      const label = file.name.replace(/\.[^.]+$/, "").slice(0, 60);
      const result = await saveBrandAsset({ kind: "product", path, label });
      if (result.status === "error") setMessage(result.message);
      else if (result.status !== "ok") setMessage("Could not save that picture.");
    });
  }

  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-hairline bg-paper p-6">
      {/*
       * A still life behind the empty state, and only behind the empty state.
       *
       * It is set dressing for a shelf with nothing on it yet, so it is heavily
       * washed out and sits under the copy rather than beside it. The moment a
       * real product is saved it disappears: a photographed bottle in a panel
       * headed "your products" would otherwise read as a product somebody has,
       * and this panel must only ever show pictures they actually uploaded.
       */}
      {shelf.items.length === 0 ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/product-still.jpg"
            alt=""
            className="absolute inset-0 size-full object-cover opacity-25"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, var(--paper) 12%, color-mix(in srgb, var(--paper) 78%, transparent) 52%, color-mix(in srgb, var(--paper) 55%, transparent) 100%)",
            }}
          />
        </div>
      ) : null}
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <Package className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-sm font-semibold text-ink">Your products</h2>
          {shelf.items.length > 0 ? (
            <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {shelf.items.length} saved
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Pictures of what you sell, so a video can feature the real thing instead of something the
        model imagined. Start one straight from a picture, or attach it from the plus button in the
        message box.
      </p>

      {/*
       * A grid rather than a wrapped row of thumbnails.
       *
       * These are the only pictures on the page, and a product photo is the
       * one asset somebody recognises at a glance rather than reads. Fixed
       * ninety six pixel chips made them into a row of icons on a screen wide
       * enough to show them as pictures.
       */}
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-6">
        {shelf.items.map((product, index) => (
          <li
            key={product.id}
            className={`group relative ${index === 0 && shelf.items.length > 1 ? "sm:col-span-2 sm:row-span-2" : ""}`}
          >
            <div className="aspect-square w-full overflow-hidden rounded-xl border border-hairline bg-cloud">
              {product.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.url}
                  alt={product.label || "Saved product"}
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <span className="flex size-full items-center justify-center">
                  <Package className="size-6 text-ink-soft" aria-hidden />
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                void shelf.remove(product, async () => {
                  const result = await removeBrandAsset({ id: product.id });
                  return result.status === "ok"
                    ? { ok: true }
                    : {
                        ok: false,
                        message:
                          result.status === "error" ? result.message : "Not connected right now.",
                      };
                })
              }
              aria-label={`Remove ${product.label || "this product"}`}
              className="absolute -right-1.5 -top-1.5 inline-flex size-6 cursor-pointer items-center justify-center rounded-full border border-hairline bg-paper text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Trash2 className="size-3" aria-hidden />
            </button>

            {product.label ? (
              <p className="mt-2 truncate text-xs font-medium text-ink">{product.label}</p>
            ) : null}

            <MakeVideoButton asset={product} className="mt-1 text-xs text-ink-soft hover:text-ink">
              Make video
            </MakeVideoButton>
          </li>
        ))}

        <li>
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
            className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-hairline text-ink-soft transition-colors hover:border-primary/50 hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Spinner className="size-5" /> : <Plus className="size-5" aria-hidden />}
            <span className="text-xs">Add</span>
          </button>
        </li>
      </ul>

      {(message ?? shelf.error) ? (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {message ?? shelf.error}
        </p>
      ) : null}
    </section>
  );
}
