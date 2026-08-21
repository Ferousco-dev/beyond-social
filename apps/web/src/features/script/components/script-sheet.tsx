"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Clapperboard } from "lucide-react";

import { compileScript, type CompiledScript } from "@/lib/script/compile";
import { type PostAnalysis } from "@/lib/tiktok/analyse";

import { useScriptDraft } from "../hooks/use-script-draft";
import { ScriptMechanicsPanel } from "./script-mechanics";
import { ScriptScenes } from "./script-scenes";
import { ScriptSubjectFields } from "./script-subject";

/**
 * The script, before a credit is spent on it.
 *
 * "Use this brief" used to put a paragraph in the composer and leave the model
 * to invent the beats. This is the same step with the work done: the structure
 * that made the source hold attention on one side, the user's own subject and
 * lines on the other, both on screen and both editable before anything renders.
 *
 * Nothing here is sent. Taking the script fills the composer and stops, because
 * a render costs money and has to be something a person did on purpose.
 */
export function ScriptSheet({
  analysis,
  open,
  onOpenChange,
  onUse,
}: {
  analysis: PostAnalysis | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUse: (compiled: CompiledScript) => void;
}) {
  const draft = useScriptDraft(open ? analysis : null);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-hairline bg-paper shadow-card data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <header className="shrink-0 px-6 pt-6">
            <Dialog.Title className="text-lg font-semibold text-ink">
              {draft.script?.title ?? "Writing the script"}
            </Dialog.Title>
            <Dialog.Description className="mt-1.5 text-xs text-ink-soft">
              The structure comes from the post you picked. Everything said and shown is yours to
              change before anything is rendered.
            </Dialog.Description>
          </header>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {draft.script === null ? (
              <ScriptPlaceholder message={draft.failed} />
            ) : (
              <>
                <ScriptMechanicsPanel mechanics={draft.script.mechanics} />
                <ScriptSubjectFields
                  subject={draft.script.subject}
                  stale={draft.stale}
                  writing={draft.writing}
                  onChange={draft.setSubjectField}
                  onRewrite={draft.rewrite}
                />
                <ScriptScenes scenes={draft.script.scenes} onChange={draft.setSceneField} />
              </>
            )}
          </div>

          <footer className="flex shrink-0 justify-end gap-2 border-t border-hairline px-6 py-4">
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-10 cursor-pointer items-center rounded-full px-4 text-sm font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Not this one
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={draft.script === null || draft.writing}
              onClick={() => {
                if (draft.script !== null) onUse(compileScript(draft.script));
              }}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Clapperboard className="size-4" aria-hidden />
              Take this script
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Both waiting and failing look like this, because both are "no script yet". */
function ScriptPlaceholder({ message }: { message: string | null }) {
  if (message !== null) return <p className="py-8 text-center text-sm text-ink-soft">{message}</p>;

  return (
    <div className="space-y-3" aria-busy>
      <span className="sr-only">Writing your script</span>
      <div className="h-24 animate-pulse rounded-xl bg-cloud" />
      <div className="h-28 animate-pulse rounded-xl bg-cloud" />
      <div className="h-32 animate-pulse rounded-xl bg-cloud" />
    </div>
  );
}
