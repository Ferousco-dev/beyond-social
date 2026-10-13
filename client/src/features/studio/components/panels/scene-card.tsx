import { Loader2 } from "lucide-react";

import { ErrorHelp } from "@/components/billing/error-help";
import { Button } from "@/components/ui/button";

import { type SceneProposal } from "../../hooks/use-assistant";

/** A proposed AI scene. Nothing is made or charged until the person presses Generate. */
export function SceneCard({ scene, onConfirm, onDismiss }: { scene: SceneProposal; onConfirm: () => void; onDismiss: () => void }) {
  if (scene.state === "dismissed") return <p className="text-xs text-ink-soft">Scene skipped.</p>;
  return (
    <div className="w-full space-y-2 rounded-xl border border-hairline bg-canvas p-3">
      <p className="text-xs text-ink-soft">New scene · {scene.seconds}s</p>
      <p className="text-sm text-ink">{scene.prompt}</p>
      {scene.state === "ready" ? (
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onConfirm}>
            Generate{scene.credits !== null ? ` · ${scene.credits} credits` : ""}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Skip
          </Button>
        </div>
      ) : null}
      {scene.state === "working" ? (
        <p role="status" className="flex items-center gap-2 text-xs text-ink-soft">
          <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
          Generating. It is added to the end of your video when ready.
        </p>
      ) : null}
      {scene.state === "done" ? <p className="text-xs text-success">Added to the timeline.</p> : null}
      {scene.state === "failed" ? (
        <p role="alert" className="text-xs text-destructive">
          {scene.message} <ErrorHelp code={scene.code} className="font-medium text-ink underline underline-offset-2" />
        </p>
      ) : null}
    </div>
  );
}
