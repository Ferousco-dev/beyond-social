import { Mic, Sparkles } from "lucide-react";
import { type Metadata } from "next";

export const metadata: Metadata = { title: "Voice" };

/**
 * Two things live here, and only one of them exists yet.
 *
 * Recording a clip works today and happens in the composer, because the clip
 * belongs to the video being made rather than to the account. This page says so
 * rather than duplicating the control somewhere it would be found second.
 *
 * Cloning is the paid version and is not built. It is shown anyway: a locked
 * feature can be wanted, a hidden one cannot. The wording deliberately does not
 * promise a date, and there is no upgrade button, because the thing standing in
 * the way is our own setup rather than the reader's plan. Charging someone to
 * unlock something we cannot yet deliver is a refund waiting to happen.
 */
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
              Use the microphone next to the message box. Record what you want said, attach a
              photo, and the video is made of you saying it, in your own voice.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-hairline bg-paper p-5 opacity-70">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-cloud text-ink-soft"
          >
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-medium text-ink">Save your voice</h2>
              <span className="rounded-full border border-hairline px-2 py-0.5 text-xs text-ink-soft">
                Not yet available
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              Record once, then type what you want said instead of recording it each time. We are
              still working on this, and it is not ready to turn on.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
