"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Coins, RefreshCw, Search, X } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

import { startSubscription } from "@/features/billing/actions";
import { RedirectButton } from "@/features/billing/redirect-button";

const METER_WIDTH = 180;

/** A flat picture of the gap: what the video needs against what you have, and the refill that Pro adds. */
function Artwork({ cost, balance, pro }: { cost: number; balance: number; pro: boolean }): ReactNode {
  const filled = Math.round(METER_WIDTH * Math.min(Math.max(balance / cost, 0), 1));
  return (
    <svg viewBox="0 0 360 120" role="img" aria-label={`A meter showing ${balance} credits of the ${cost} this video needs`} className="block w-full">
      <text x="30" y="30" fontSize="12" className="fill-ink-soft">This video needs {cost}</text>
      <rect x="30" y="40" width={METER_WIDTH} height="14" rx="7" className="fill-paper stroke-hairline" strokeWidth="1" />
      <rect x="30" y="40" width={Math.max(filled, 14)} height="14" rx="7" className="fill-primary" />
      <line x1={30 + METER_WIDTH} y1="34" x2={30 + METER_WIDTH} y2="60" strokeWidth="1.5" strokeLinecap="round" className="stroke-ink" />
      <text x="30" y="80" fontSize="12" className="fill-ink-soft">You have {balance}</text>
      {pro ? null : (
        <>
          <line x1="236" y1="62" x2="250" y2="62" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1 5" className="stroke-ink-soft" />
          <circle cx="298" cy="58" r="28" className="fill-paper stroke-hairline" strokeWidth="1" />
          <circle cx="298" cy="58" r="22" fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray="104 34" transform="rotate(-100 298 58)" className="stroke-primary" />
          <line x1="298" y1="58" x2="298" y2="44" strokeWidth="2" strokeLinecap="round" className="stroke-ink" />
          <line x1="298" y1="58" x2="308" y2="64" strokeWidth="2" strokeLinecap="round" className="stroke-ink" />
          <text x="298" y="108" fontSize="12" textAnchor="middle" className="fill-ink-soft">Refills every 5 hours</text>
        </>
      )}
    </svg>
  );
}

function Benefit({ icon: Icon, children }: { icon: typeof Coins; children: ReactNode }): ReactNode {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-snug text-ink">
      <Icon className="mt-px size-[18px] shrink-0 text-primary" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

/**
 * Shown when someone presses Generate without enough credits. A Free member
 * is offered Pro; a Pro member is pointed at more credits. Either way nothing
 * has been charged, and shortening the video is one tap away.
 */
export function CreditShortfallDialog({
  open,
  onClose,
  cost,
  balance,
  proPrice,
}: {
  open: boolean;
  onClose: () => void;
  cost: number;
  balance: number;
  /** The monthly Pro price for a Free member; null means they are already on Pro. */
  proPrice: string | null;
}): ReactNode {
  const short = Math.max(cost - balance, 0);
  const pro = proPrice === null;
  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] max-h-[92dvh] w-[min(400px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-hairline bg-paper text-ink shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <div className="relative bg-primary/10 px-5 pb-2 pt-5">
            <Dialog.Close asChild>
              <button type="button" aria-label="Close" className="absolute right-2.5 top-2.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-ink-soft hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-primary pointer-coarse:size-11">
                <X className="size-[18px]" aria-hidden />
              </button>
            </Dialog.Close>
            <Artwork cost={cost} balance={balance} pro={pro} />
          </div>

          <div className="px-6 pb-5 pt-5">
            <Dialog.Title className="text-lg font-semibold leading-tight tracking-tight">You&apos;re {short} credits short</Dialog.Title>
            <Dialog.Description className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              This video costs {cost} credits and you have {balance}. You haven&apos;t been charged.
            </Dialog.Description>

            {pro ? (
              <Link
                href="/dashboard/settings/billing"
                className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-primary text-[15px] font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Get more credits
              </Link>
            ) : (
              <>
                <div className="mt-5 rounded-xl border border-hairline p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium">Pro</span>
                    <span className="text-sm">
                      <span className="font-medium">{proPrice}</span>
                      <span className="text-ink-soft"> a month</span>
                    </span>
                  </div>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    <Benefit icon={RefreshCw}>No credits to count. Limits refill every five hours and every week.</Benefit>
                    <Benefit icon={Search}>No daily search limits.</Benefit>
                    <Benefit icon={Coins}>Buy credits to keep going when a limit is full.</Benefit>
                  </ul>
                </div>
                <RedirectButton action={startSubscription} className="mt-5 h-11 w-full">
                  Upgrade to Pro
                </RedirectButton>
              </>
            )}

            <button type="button" onClick={onClose} className="mt-1.5 inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-[10px] text-sm text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-primary">
              Shorten the video instead
            </button>
            {pro ? null : <p className="mt-1 text-center text-xs text-ink-soft">Cancel any time from your billing page.</p>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
