import { Mic } from "lucide-react";
import { type Metadata } from "next";
import { Suspense } from "react";

import { EnrollSection } from "@/features/voice/enroll-section";

export const metadata: Metadata = { title: "Voice" };

function LoadingSkeleton() {
  return (
    <div className="rounded-2xl border border-hairline bg-paper p-5">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <Mic className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="h-4 w-32 animate-pulse rounded bg-cloud" />
          <div className="mt-2 h-3 w-64 animate-pulse rounded bg-cloud" />
        </div>
      </div>
    </div>
  );
}

export default function VoicePage() {
  return (
    <section className="mt-6 flex flex-col gap-4 lg:mt-8">
      <div className="rounded-2xl border border-hairline bg-paper p-5">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
          >
            <Mic className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-ink">Record for a video</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Use the microphone next to the message box. Record what you want said, attach a photo,
              and the video is made of you saying it, in your own voice.
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <EnrollSection />
      </Suspense>
    </section>
  );
}
