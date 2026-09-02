import { type Metadata } from "next";

import { AvatarCard } from "@/features/assets/components/avatar-card";
import { LibraryHeader } from "@/features/assets/components/library-header";
import { LibraryWorkspace } from "@/features/assets/components/library/library-workspace";
import { ProductsCard } from "@/features/assets/components/products-card";
import { TwinLibrary } from "@/features/live-avatar/components/twin-library";
import { TwinSpeak } from "@/features/live-avatar/components/twin-speak";
import { listTwins } from "@/features/live-avatar/delete-actions";
import { twinVideoReadiness } from "@/features/live-avatar/video-actions";
import { getVoiceProfile } from "@/features/voice/actions";
import { EnrollSection } from "@/features/voice/enroll-section";
import { getBrandLibrary } from "@/lib/assets/brand";

export const metadata: Metadata = { title: "Assets" };
export const dynamic = "force-dynamic";

/**
 * Everything a video can be made out of, in one place.
 *
 * Read on the server and composed on the client, because the filter is one
 * decision about the whole page while the data behind it is per-account and
 * signed.
 *
 * The showcase panels above and the working cards below are deliberately
 * different things. The panels say what somebody has and offer the shortest
 * route to using it; the cards underneath are the ones that upload, record,
 * rename, take consent and delete, and they are the ones that were already
 * here. None of that logic moved.
 */
export default async function AssetsPage() {
  const [library, twins, readiness, voice] = await Promise.all([
    getBrandLibrary(),
    listTwins(),
    twinVideoReadiness(),
    getVoiceProfile(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-8">
      <div className="py-8 lg:py-10">
        {/*
         * Counted from what is actually saved: every recorded likeness, the
         * saved photo, the voice clip, and each product picture.
         */}
        <LibraryHeader
          hasTwin={twins.length > 0}
          assetCount={
            twins.length +
            (library.avatar ? 1 : 0) +
            (voice.status === "ok" && voice.profile ? 1 : 0) +
            library.products.length
          }
        />
      </div>

      <LibraryWorkspace
        twins={twins}
        photo={library.avatar}
        voice={voice.status === "ok" ? voice.profile : null}
        products={library.products}
        productsSlot={<ProductsCard products={library.products} />}
        voiceRecorderSlot={<EnrollSection />}
        avatarManagerSlot={
          <div className="flex flex-col gap-4">
            <TwinLibrary twins={twins} />
            <TwinSpeak twins={twins} readiness={readiness} />
            <AvatarCard avatar={library.avatar} />
          </div>
        }
      />
    </div>
  );
}
