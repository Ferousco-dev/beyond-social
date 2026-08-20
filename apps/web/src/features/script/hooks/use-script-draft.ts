"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

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
 */

export interface ScriptDraft {
  readonly script: VideoScript | null;
  readonly writing: boolean;
  readonly failed: string | null;
  /** True once the subject has been edited and the lines no longer match it. */
  readonly stale: boolean;
  readonly setSubjectField: (field: keyof ScriptSubject, value: string) => void;
  readonly setSceneField: (index: number, patch: Partial<ScriptScene>) => void;
  readonly rewrite: () => void;
}

export function useScriptDraft(analysis: PostAnalysis | null): ScriptDraft {
  const [script, setScript] = useState<VideoScript | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
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
      return;
    }
    write(analysis);
  }, [analysis, write]);

  const setSubjectField = useCallback((field: keyof ScriptSubject, value: string) => {
    setScript((current) =>
      current === null ? current : { ...current, subject: { ...current.subject, [field]: value } },
    );
    setStale(true);
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

  const rewrite = useCallback(() => {
    if (analysis === null || script === null) return;
    write(analysis, script.subject);
  }, [analysis, script, write]);

  return { script, writing, failed, stale, setSubjectField, setSceneField, rewrite };
}
