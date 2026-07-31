import { ShieldAlert } from "lucide-react";
import { type ReactNode } from "react";

/**
 * Why the accounts below have no Erase button.
 *
 * The state is real and the console shows it, but the action does not exist
 * yet. Saying so plainly is the point: an operator who sees "eligible for
 * erasure" and no way to act on it will otherwise assume the page is broken, or
 * worse, go looking for another route to the same irreversible thing.
 */
export function ErasureNotice({ count }: { count: number }): ReactNode {
  return (
    <div className="flex gap-3 rounded-xl border border-warning/25 bg-warning/10 px-4 py-3">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <div className="space-y-1 text-sm">
        <p className="font-medium text-ink">Permanent erasure is not available yet.</p>
        <p className="text-ink-soft">
          {count === 1
            ? "One account has passed its 30 day grace period"
            : `${count} accounts have passed their 30 day grace period`}{" "}
          and can be erased. Nothing has been erased: the data is still here, flagged rather than
          gone. An irreversible delete needs the owner&rsquo;s decision before it is built, so this
          page reports the state and stops there. Until that exists, a GDPR erasure request has to
          be answered by hand.
        </p>
      </div>
    </div>
  );
}
