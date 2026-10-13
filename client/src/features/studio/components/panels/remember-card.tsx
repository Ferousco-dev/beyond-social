import { type RememberProposal } from "../../hooks/use-assistant";

interface Props {
  readonly proposal: RememberProposal;
  readonly onSave: () => void;
  readonly onDismiss: () => void;
}

const button =
  "min-h-9 cursor-pointer rounded-lg px-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

/** Offers to keep a fact in memory. Saving is always the user's choice. */
export function RememberCard({ proposal, onSave, onDismiss }: Props) {
  if (proposal.state === "dismissed") return null;
  if (proposal.state === "saved") return <p className="px-1 text-xs text-ink-soft">Saved to your memory.</p>;

  return (
    <div className="w-full max-w-[90%] rounded-2xl border border-hairline p-3">
      <p className="text-xs text-ink-soft">Remember this for future videos?</p>
      <p className="mt-1 text-sm text-ink">{proposal.fact}</p>
      {proposal.state === "failed" ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {proposal.message}
        </p>
      ) : null}
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={onSave} disabled={proposal.state === "saving"} className={`${button} bg-primary text-primary-foreground hover:opacity-90`}>
          {proposal.state === "saving" ? "Saving…" : "Remember"}
        </button>
        <button type="button" onClick={onDismiss} className={`${button} text-ink-soft hover:text-ink`}>
          No thanks
        </button>
      </div>
    </div>
  );
}
