import { Video } from "lucide-react";
import { type Metadata, type Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AssetSection, AssetSectionNav } from "@/features/assets/components/asset-sections";
import { AvatarCard } from "@/features/assets/components/avatar-card";
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
 * A face, the things being sold, and a voice were three separate rows buried in
 * settings, which is where a preference lives rather than where material lives.
 * They answer one question between them, asked every time a video is started:
 * who is on screen, what is on screen, and who is speaking.
 *
 * The recorded avatar joined them rather than becoming a fourth destination.
 * It is the same question, answered better, and a sidebar that offers "Assets"
 * and "Your avatar" as separate places makes somebody choose between two names
 * for one idea before they know what either holds.
 */
export default async function AssetsPage() {
  const [library, twins, readiness] = await Promise.all([
    getBrandLibrary(),
    listTwins(),
    twinVideoReadiness(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Assets</h1>
      <p className="mt-2 mb-6 max-w-xl text-sm text-ink-soft">
        Your face, your products, and your voice. Saved once, then attached to any video from the
        plus button in the message box.
      </p>

      <AssetSectionNav />

      <AssetSection
        id="avatar"
        title="Avatar"
        description="A recording of you, trained once, so every video can be made in your own face and voice."
      >
        <div className="flex flex-col gap-4">
          <TwinLibrary twins={twins} />

          {/*
           * Directly under the list, because a trained avatar and the thing it
           * was trained for are one thought. Anywhere else and somebody reads
           * "Ready to use" with nothing on the page that uses it.
           */}
          <TwinSpeak twins={twins} readiness={readiness} />

          <Link
            href={"/dashboard/avatar/new" as Route}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Video className="size-4" aria-hidden />
            {twins.length === 0 ? "Record your avatar" : "Record another"}
          </Link>

          {/*
           * The still photo sits under the recording rather than beside it.
           * They are different features that both put a face on screen: this
           * one animates a single photo against a voice clip, and it is the one
           * that works today, so it stays reachable while the trained avatar
           * waits on a provider key.
           */}
          <AvatarCard avatar={library.avatar} />
        </div>
      </AssetSection>

      <AssetSection
        id="voice"
        title="Voice"
        description="A short recording of you speaking, so videos can be narrated in your voice."
      >
        <Suspense fallback={<VoiceCardSkeleton />}>
          <EnrollSection />
        </Suspense>
      </AssetSection>

      <AssetSection
        id="products"
        title="Products"
        description="What you sell, so a video can show the real thing rather than a stand-in."
      >
        <ProductsCard products={library.products} />
      </AssetSection>
    </div>
  );
}
