import { type Metadata } from "next";
import { Suspense } from "react";

import { AvatarCard } from "@/features/assets/components/avatar-card";
import { ProductsCard } from "@/features/assets/components/products-card";
import { VoiceCardSkeleton } from "@/features/assets/components/voice-card-skeleton";
import { EnrollSection } from "@/features/voice/enroll-section";
import { getBrandLibrary } from "@/lib/assets/brand";

export const metadata: Metadata = { title: "Assets" };
export const dynamic = "force-dynamic";

/**
 * Everything a video can be made out of, in one place.
 *
 * A face, the things being sold, and a voice were three separate rows buried in
 * settings, which is where a preference lives rather than where material lives.
 * They answer one question between them, asked every time a video is started:
 * who is on screen, what is on screen, and who is speaking. So they are a
 * destination in the sidebar now, next to the library, and settings keeps only
 * the settings.
 *
 * The page reads differently by state, without two different pages. A brand-new
 * account sees the face card alone with an explanation of what it is for,
 * because a shelf of empty categories is a wall, not a welcome. Once something
 * is saved, every section shows: the library replaces the onboarding.
 */
export default async function AssetsPage() {
  const library = await getBrandLibrary();
  const onboarding = library.avatar === null && library.products.length === 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Assets</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-soft">
        {onboarding
          ? "Save a photo of yourself and it becomes the face of your videos. You can add your products and your voice afterwards."
          : "Your face, your products, and your voice. Saved once, then attached to any video from the plus button in the message box."}
      </p>

      <div className="mt-6 flex flex-col gap-4 lg:mt-8">
        <AvatarCard avatar={library.avatar} />
        {onboarding ? null : <ProductsCard products={library.products} />}
        {onboarding ? null : (
          <Suspense fallback={<VoiceCardSkeleton />}>
            <EnrollSection />
          </Suspense>
        )}
      </div>
    </div>
  );
}
