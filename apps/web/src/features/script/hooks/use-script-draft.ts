"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { type BrandAsset } from "@/lib/assets/brand";
import { captureBaseline, type ScriptBaseline } from "@/lib/script/divergence";
import { type ScriptScene, type ScriptSubject, type VideoScript } from "@/lib/script/schema";
import { type PostAnalysis } from "@/lib/tiktok/analyse";

import { writeScriptAction } from "../actions";

/**
 * The script while somebody is working on it.
 *
 * Two kinds of edit, and they behave differently on purpose. Changing a line or
 * a shot is direct: it is the user's text and nothing rewrites it. Changing who
 * the video is about is not, because every line downstream was written for the
 * old subject, so that one offers a rewrite rather than performing one. Doing it
 * silently would throw away edits they had already made.
 *
 * A third kind lives here too: binding the speaker or the product to a saved
 * asset. `subject.speaker` and `subject.product` were always free text, which
 * meant a script written for "a founder in her thirties" rendered a generated
 * stranger, never the face or the product actually saved to the account, even
 * though the pipeline has known how to feature a saved asset exactly since
 * products were added. Binding is what connects the two: it is not a rewrite,
 * because the subject text is set to match rather than regenerated, and it is
 * not silent, because it only happens when the user picks the chip.
 */

export interface AssetBindings {
  readonly speaker: BrandAsset | null;
  readonly product: BrandAsset | null;
}

export interface ScriptDraft {
  readonly script: VideoScript | null;
  readonly writing: boolean;
  readonly failed: string | null;
  /** True once the subject has been edited and the lines no longer match it. */
  readonly stale: boolean;
  /**
   * The scene structure as first written. Null until a script exists, and
   * reset every time one is (re)written, since a rewrite produces a new
   * pattern to hold live edits against rather than the old one.
   */
  readonly baseline: ScriptBaseline | null;
  readonly bindings: AssetBindings;
  readonly setSubjectField: (field: keyof ScriptSubject, value: string) => void;
  readonly setSceneField: (index: number, patch: Partial<ScriptScene>) => void;
  /** Binds the speaker to a saved avatar, or clears the binding with null. */
  readonly bindSpeaker: (asset: BrandAsset | null) => void;
  /** Binds the product to a saved product photo, or clears it with null. */
  readonly bindProduct: (asset: BrandAsset | null) => void;
  readonly rewrite: () => void;
}

const NO_BINDINGS: AssetBindings = { speaker: null, product: null };

export function useScriptDraft(analysis: PostAnalysis | null): ScriptDraft {
  const [script, setScript] = useState<VideoScript | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [baseline, setBaseline] = useState<ScriptBaseline | null>(null);
  const [bindings, setBindings] = useState<AssetBindings>(NO_BINDINGS);
  const [writing, startWriting] = useTransition();

  const write = useCallback((source: PostAnalysis, subject?: ScriptSubject) => {
    setFailed(null);
    startWriting(async () => {
      const result = await writeScriptAction({
        analysis: source,
        ...(subject ? { subject } : {}),
      });
      if (result.status === "ok") {
        setScript(result.script);
        setStale(false);
        setBaseline(captureBaseline(result.script.scenes));
        return;
      }
      setFailed(
        result.status === "unconfigured"
          ? "The script writer is not switched on for this deployment."
          : result.message,
      );
    });
  }, []);

  /** A new analysis is a new script. Nothing of the previous one carries over. */
  useEffect(() => {
    if (analysis === null) {
      setScript(null);
      setStale(false);
      setFailed(null);
      setBaseline(null);
      setBindings(NO_BINDINGS);
      return;
    }
    write(analysis);
    setBindings(NO_BINDINGS);
  }, [analysis, write]);

  const setSubjectField = useCallback((field: keyof ScriptSubject, value: string) => {
    setScript((current) =>
      current === null ? current : { ...current, subject: { ...current.subject, [field]: value } },
    );
    setStale(true);
    // Typing over a bound field is choosing something other than the asset it
    // was bound to, so the binding stops being true the moment the text no
    // longer says what it says.
    if (field === "speaker") setBindings((current) => ({ ...current, speaker: null }));
    if (field === "product") setBindings((current) => ({ ...current, product: null }));
  }, []);

  const setSceneField = useCallback((index: number, patch: Partial<ScriptScene>) => {
    setScript((current) =>
      current === null
        ? current
        : {
            ...current,
            scenes: current.scenes.map((scene, i) =>
              i === index ? { ...scene, ...patch } : scene,
            ),
          },
    );
  }, []);

  /**
   * Binding sets the subject text directly rather than through
   * `setSubjectField`, which exists to clear a binding the moment its field is
   * typed into; going through it here would have the bind undo itself in the
   * same call.
   */
  const bindSpeaker = useCallback((asset: BrandAsset | null) => {
    setBindings((current) => ({ ...current, speaker: asset }));
    if (asset) {
      setScript((current) =>
        current === null
          ? current
          : { ...current, subject: { ...current.subject, speaker: "You" } },
      );
      setStale(true);
    }
  }, []);

  const bindProduct = useCallback((asset: BrandAsset | null) => {
    setBindings((current) => ({ ...current, product: asset }));
    if (asset) {
      setScript((current) =>
        current === null
          ? current
          : {
              ...current,
              subject: { ...current.subject, product: asset.label || "This product" },
            },
      );
      setStale(true);
    }
  }, []);

  const rewrite = useCallback(() => {
    if (analysis === null || script === null) return;
    write(analysis, script.subject);
  }, [analysis, script, write]);

  return {
    script,
    writing,
    failed,
    stale,
    baseline,
    bindings,
    setSubjectField,
    setSceneField,
    bindSpeaker,
    bindProduct,
    rewrite,
  };
}
