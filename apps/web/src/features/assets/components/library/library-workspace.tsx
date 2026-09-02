"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";

import { type TwinSummary } from "@/features/live-avatar/delete-actions";
import { type VoiceProfile } from "@/features/voice/actions";
import { type BrandAsset } from "@/lib/assets/brand";

import { AvatarPanel } from "./avatar-panel";
import { LibraryFilter, type AssetFilter } from "./library-filter";
import { UseInVideo } from "./use-in-video";
import { VoicePanel } from "./voice-panel";

/**
 * The workspace: which panels are on screen, and what the search has narrowed
 * them to.
 *
 * State lives here rather than in each panel because the filter is one decision
 * about the whole page. The panels below it stay presentational, and the
 * existing cards that own uploading, consent and deletion are rendered by the
 * server page underneath, untouched.
 */

function matches(query: string, ...fields: readonly (string | null | undefined)[]): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  return fields.some((field) => (field ?? "").toLowerCase().includes(needle));
}

export function LibraryWorkspace({
  twins,
  photo,
  voice,
  products,
  productsSlot,
  voiceRecorderSlot,
  avatarManagerSlot,
}: {
  twins: readonly TwinSummary[];
  photo: BrandAsset | null;
  voice: VoiceProfile | null;
  products: readonly BrandAsset[];
  /** The existing products card, which owns uploading and deletion. */
  productsSlot: ReactNode;
  /** The existing voice card, which owns recording and consent. */
  voiceRecorderSlot: ReactNode;
  /** The existing twin list and still-photo card. */
  avatarManagerSlot: ReactNode;
}): ReactNode {
  const [filter, setFilter] = useState<AssetFilter>("all");
  const [query, setQuery] = useState("");
  const voiceRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const twinHit = twins.some((twin) => matches(query, twin.name)) || twins.length === 0;
    const productHit = products.some((product) => matches(query, product.label));
    const searching = query.trim() !== "";

    return {
      avatar: (filter === "all" || filter === "avatar") && (!searching || twinHit),
      voice: (filter === "all" || filter === "voice") && (!searching || matches(query, "voice")),
      products: (filter === "all" || filter === "products") && (!searching || productHit),
    };
  }, [filter, query, twins, products]);

  const nothing = !visible.avatar && !visible.voice && !visible.products;

  return (
    <div className="flex flex-col gap-6">
      <LibraryFilter
        active={filter}
        onChange={setFilter}
        query={query}
        onQuery={setQuery}
        counts={{ avatar: twins.length, products: products.length, voice: voice ? 1 : 0 }}
      />

      {nothing ? (
        <p className="rounded-2xl border border-dashed border-hairline p-10 text-center text-sm text-ink-soft">
          Nothing here matches &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {visible.avatar ? (
          <div className="xl:col-span-7">
            <AvatarPanel twins={twins} photo={photo} />
          </div>
        ) : null}

        {visible.voice ? (
          <div className="xl:col-span-5">
            <VoicePanel
              profile={voice}
              onRecord={() =>
                voiceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
            />
          </div>
        ) : null}

        {visible.products ? <div className="xl:col-span-7">{productsSlot}</div> : null}

        {visible.avatar || visible.products ? (
          <div className="xl:col-span-5">
            <UseInVideo avatar={photo} products={products} />
          </div>
        ) : null}
      </div>

      {/*
       * The cards that actually do the work sit below the showcase panels above
       * them. Uploading a photo, recording a voice, naming and deleting a twin,
       * and the consent dialogs are all here, exactly as they were, because the
       * point of this page was never to rewrite them.
       */}
      <div className="flex flex-col gap-6 border-t border-hairline pt-8">
        <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">
          Manage what is saved
        </h2>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {visible.avatar ? <div className="xl:col-span-7">{avatarManagerSlot}</div> : null}
          {visible.voice ? (
            <div ref={voiceRef} className="xl:col-span-5">
              {voiceRecorderSlot}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
