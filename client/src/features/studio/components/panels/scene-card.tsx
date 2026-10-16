import { useState } from "react";
import { Loader2 } from "lucide-react";

import { ErrorHelp } from "@/components/billing/error-help";
import { Button } from "@/components/ui/button";

import { mediaId } from "../../lib/media-ref";
import { selectProject, useStudio } from "../../store/editor-store";
import { type SceneProposal } from "../../hooks/use-assistant";

/** A proposed AI scene. Nothing is made or charged until the person presses Generate. */
export function SceneCard({ scene, onConfirm, onDismiss }: { scene: SceneProposal; onConfirm: (imageMediaId?: string) => void; onDismiss: () => void }) {
  const project = useStudio(selectProject);
  const images = (project?.assets ?? [])
    .filter((asset) => asset.kind === "image")
    .flatMap((asset) => {
      const id = mediaId(asset.src);
      return id ? [{ id, name: asset.name }] : [];
    });
  const [imageMediaId, setImageMediaId] = useState("");
  if (scene.state === "dismissed") return <p className="text-xs text-ink-soft">Scene skipped.</p>;
  return (
    <div className="w-full space-y-2 rounded-xl border border-hairline bg-canvas p-3">
      <p className="text-xs text-ink-soft">New scene · {scene.seconds}s</p>
      <p className="text-sm text-ink">{scene.prompt}</p>
      {images.length > 0 && scene.state === "ready" ? (
        <label className="block text-xs font-medium text-ink-soft">
          Reference image
          <select value={imageMediaId} onChange={(event) => setImageMediaId(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-hairline bg-paper px-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-primary">
            <option value="">No reference image</option>
            {images.map((image) => <option key={image.id} value={image.id}>{image.name}</option>)}
          </select>
          <span className="mt-1 block font-normal">Used as the first frame to guide the new scene’s character and look.</span>
        </label>
      ) : null}
      {scene.state === "ready" ? (
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => onConfirm(imageMediaId || undefined)}>
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
