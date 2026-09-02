import { type Metadata } from "next";
import { Suspense } from "react";

import { AssetSection, AssetSectionNav } from "@/features/assets/components/asset-sections";
import { AvatarCard } from "@/features/assets/components/avatar-card";
import { LibraryHeader } from "@/features/assets/components/library-header";
import { ProductsCard } from "@/features/assets/components/products-card";
import { VoiceCardSkeleton } from "@/features/assets/components/voice-card-skeleton";
import { TwinLibrary } from "@/features/live-avatar/components/twin-library";
import { TwinSpeak } from "@/features/live-avatar/components/twin-speak";
import { listTwins } from "@/features/live-avatar/delete-actions";
import { twinVideoReadiness } from "@/features/live-avatar/video-actions";
import { EnrollSection } from "@/features/voice/enroll-section";
import { getBrandLibrary } from "@/lib/assets/brand";

export const metadata: Metadata = { title: "Assets" };
export const dynamic = "force-dynamic";

/**
 * Everything a video can be made out of, in one place.
 *
 * A face, the things being sold, and a voice answer one question between them,
 * asked every time a video is started: who is on screen, what is on screen, and
 * who is speaking.
 *
 * Laid out across the width rather than down a column. The three are different
 * kinds of material, not three settings, and stacking them in a narrow measure
 * made them read as a list of near-identical rows on a screen that had room for
 * all of them at once.
 *
 * The proportions are the argument. Avatar is the widest because it holds the
 * most: every likeness somebody has recorded, what to do with one, and the
 * still photo underneath. Voice is one recording and needs a column, not a row.
 * Products are pictures, and pictures want the full width to be seen in.
 */
export default async function AssetsPage() {
  const [library, twins, readiness] = await Promise.all([
    getBrandLibrary(),
    listTwins(),
    twinVideoReadiness(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-8">
      <div className="pt-8 lg:pt-10">
        <LibraryHeader
          hasTwin={twins.length > 0}
          assetCount={twins.length + library.products.length + (library.avatar ? 1 : 0)}
        />
      </div>

      <AssetSectionNav
        counts={{
          avatar: twins.length + (library.avatar ? 1 : 0),
          products: library.products.length,
        }}
      />

      <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 lg:grid-cols-12">
        <AssetSection
          id="avatar"
          title="Avatar"
          description="A recording of you, trained once, so a video can be made in your own face. The photo underneath is the simpler version: one still, animated against a voice clip."
          className="lg:col-span-8"
        >
          <div className="flex flex-col gap-4">
            <TwinLibrary twins={twins} />

            {/*
             * Directly under the list, because a trained avatar and the thing
             * it was trained for are one thought. Anywhere else and somebody
             * reads "Ready to use" with nothing on the page that uses it.
             */}
            <TwinSpeak twins={twins} readiness={readiness} />

            {/*
             * The still photo is a different feature that also puts a face on
             * screen, and it is the one that works without a provider key, so
             * it stays reachable rather than being hidden behind the trained
             * one it does not depend on.
             */}
            <AvatarCard avatar={library.avatar} />
          </div>
        </AssetSection>

        <AssetSection
          id="voice"
          title="Voice"
          description="A short recording of you reading one line, so a video can be narrated in your voice. It is a clip that gets used, not a cloned voice that gets synthesised."
          className="lg:col-span-4"
        >
          <Suspense fallback={<VoiceCardSkeleton />}>
            <EnrollSection />
          </Suspense>
        </AssetSection>

        <AssetSection
          id="products"
          title="Products"
          description="What you sell, so a video can show the real thing rather than a stand-in."
          className="lg:col-span-12"
        >
          <ProductsCard products={library.products} />
        </AssetSection>
      </div>
    </div>
  );
}
