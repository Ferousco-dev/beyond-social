"use client";

import { ChevronRight, Clapperboard, Package, TrendingUp, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ComponentType, type ReactNode } from "react";

import { leaveSeed } from "@/lib/composer/seed";
import { type BrandAsset } from "@/lib/assets/brand";

/**
 * The shortest route from something saved to a video made with it.
 *
 * Every row here starts a real turn: the composer opens with the picture
 * attached and a first line to edit, exactly as the button on each picture
 * does. Nothing is sent, because a render costs money.
 *
 * A row only appears when the thing it needs exists. The mockup this follows
 * had a third entry for motion transfer, and there is no saved footage asset in
 * this product for it to act on, so it is absent rather than present and dead.
 * Trends takes its place because it is a real route somebody would want next.
 */

interface Row {
  readonly key: string;
  readonly icon: ComponentType<{ className?: string }>;
  readonly title: string;
  readonly detail: string;
  readonly run: () => void;
}

export function UseInVideo({
  avatar,
  products,
}: {
  avatar: BrandAsset | null;
  products: readonly BrandAsset[];
}): ReactNode {
  const router = useRouter();

  const seed = (asset: BrandAsset, prompt: string) => () => {
    if (asset.url === null) return;
    leaveSeed({ prompt, photos: [{ id: asset.id, url: asset.url, path: asset.path }] });
    router.push("/dashboard/c/new");
  };

  const firstProduct = products.find((product) => product.url !== null) ?? null;

  const rows: readonly Row[] = [
    ...(avatar?.url
      ? [
          {
            key: "avatar",
            icon: UserRound,
            title: "Avatar video",
            detail: "You talking to camera.",
            run: seed(
              avatar,
              "A short vertical video of me talking to camera, filmed like a phone selfie in natural light.",
            ),
          },
        ]
      : []),
    ...(firstProduct
      ? [
          {
            key: "product",
            icon: Package,
            title: "Product showcase",
            detail: `Built around ${firstProduct.label.trim() || "your product"}.`,
            run: seed(
              firstProduct,
              `A short vertical video featuring ${firstProduct.label.trim() || "this product"}, shown close up and in use.`,
            ),
          },
        ]
      : []),
    {
      key: "trends",
      icon: TrendingUp,
      title: "Start from a trend",
      detail: "Find a post that is working and build from it.",
      run: () => router.push("/dashboard/trends"),
    },
  ];

  return (
    <section
      aria-labelledby="use-heading"
      className="flex flex-col rounded-2xl border border-hairline bg-paper p-6 sm:p-7"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <Clapperboard className="size-4.5" aria-hidden />
        </span>
        <h2 id="use-heading" className="text-base font-semibold text-ink">
          Use in a video
        </h2>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Opens the composer with this attached and a first line to edit. Nothing is generated until
        you send it.
      </p>

      <ul className="mt-5 flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.key}>
            <button
              type="button"
              onClick={row.run}
              className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-hairline px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span
                aria-hidden
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
              >
                <row.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{row.title}</span>
                <span className="block truncate text-xs text-ink-soft">{row.detail}</span>
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
