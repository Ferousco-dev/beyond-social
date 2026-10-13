"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { saveMemory } from "@/features/memory/actions";

import { adoptVideo, askAssistant, quoteScene, sceneStatus, startScene, watchClip } from "../assist-actions";
import { applyOperations, type Request } from "../core/assist.ts";
import { describeProject } from "../core/describe.ts";
import { locate } from "../core/find.ts";
import { makeId } from "../lib/format";
import { resolveSrc } from "../lib/media-ref";
import { placeGeneratedVideo } from "../lib/place-generated";
import { useStudio } from "../store/editor-store";

export interface SceneProposal {
  readonly prompt: string;
  readonly seconds: number;
  /** What it will cost, or null if the price could not be read. */
  readonly credits: number | null;
  readonly state: "ready" | "working" | "done" | "failed" | "dismissed";
  readonly message?: string;
  readonly code?: string;
}

/** A fact the assistant suggests keeping. Nothing is saved until the user agrees. */
export interface RememberProposal {
  readonly fact: string;
  readonly state: "ready" | "saving" | "saved" | "dismissed" | "failed";
  readonly message?: string;
}

interface AssistantMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly scene?: SceneProposal;
  readonly remember?: RememberProposal;
}

const HISTORY_TURNS = 10;
const POLL_MS = 4000;
const SCENE_TIMEOUT_MS = 8 * 60 * 1000;

interface Assistant {
  messages: readonly AssistantMessage[];
  busy: boolean;
  error: string | null;
  errorCode: string | undefined;
  send: (text: string) => Promise<void>;
  confirmScene: (id: string) => Promise<void>;
  dismissScene: (id: string) => void;
  confirmRemember: (id: string) => Promise<void>;
  dismissRemember: (id: string) => void;
  clear: () => void;
}

export function useAssistant(): Assistant {
  const [messages, setMessages] = useState<readonly AssistantMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const add = useCallback((message: Omit<AssistantMessage, "id">): string => {
    const id = makeId();
    setMessages((current) => [...current, { id, ...message }]);
    return id;
  }, []);
  const patchScene = useCallback((id: string, patch: Partial<SceneProposal>): void => {
    setMessages((current) => current.map((m) => (m.id === id && m.scene ? { ...m, scene: { ...m.scene, ...patch } } : m)));
  }, []);

  const patchRemember = useCallback((id: string, patch: Partial<RememberProposal>): void => {
    setMessages((current) => current.map((m) => (m.id === id && m.remember ? { ...m, remember: { ...m.remember, ...patch } } : m)));
  }, []);

  const confirmRemember = useCallback(
    async (id: string): Promise<void> => {
      const fact = messages.find((m) => m.id === id)?.remember?.fact;
      if (!fact) return;
      patchRemember(id, { state: "saving", message: undefined });
      const saved = await saveMemory(fact);
      patchRemember(id, saved.ok ? { state: "saved" } : { state: "failed", message: saved.message });
    },
    [messages, patchRemember],
  );

  const watch = useCallback(
    async (itemId: string): Promise<void> => {
      const { history, mediaUrls, setClipNote } = useStudio.getState();
      const item = locate(history.present, itemId)?.item;
      const url = item && "src" in item ? resolveSrc(item.src, mediaUrls) : "";
      if (!url.startsWith("https://")) return void add({ role: "assistant", content: "That clip is not ready to watch yet. Try again in a moment." });
      const result = await watchClip(url);
      if (!result.ok) return void add({ role: "assistant", content: result.message });
      setClipNote(itemId, result.notes.slice(0, 1200));
      add({ role: "assistant", content: `I watched it (5 credits):\n${result.notes}` });
    },
    [add],
  );

  const propose = useCallback(
    async (prompt: string, seconds: number): Promise<void> => {
      const credits = await quoteScene(seconds);
      add({ role: "assistant", content: "", scene: { prompt, seconds, credits, state: "ready" } });
    },
    [add],
  );

  const handle = useCallback(
    async (request: Request): Promise<void> => (request.kind === "watch" ? watch(request.itemId) : propose(request.prompt, request.seconds)),
    [watch, propose],
  );

  const send = useCallback(
    async (text: string): Promise<void> => {
      const message = text.trim();
      if (!message || busy) return;
      setError(null);
      setErrorCode(undefined);
      setBusy(true);
      const history = messages
        .filter((m) => m.content)
        .slice(-HISTORY_TURNS)
        .map((m) => ({ role: m.role, content: m.content }));
      add({ role: "user", content: message });
      const { history: h, currentTime, clipNotes } = useStudio.getState();
      const result = await askAssistant({ message, history, state: describeProject(h.present, currentTime, clipNotes), projectId: useStudio.getState().projectId ?? undefined });
      if (!result.ok) {
        setBusy(false);
        setErrorCode(result.code);
        return setError(result.message);
      }

      // Edits apply together as one undo step, to whatever the project is now.
      const store = useStudio.getState();
      let summary = result.reply;
      const applied = applyOperations(store.history.present, result.operations, makeId);
      if (applied.project !== store.history.present) store.edit(() => ({ ok: true, value: applied.project }));
      if (applied.seek !== null) store.seek(applied.seek);
      if (applied.failures.length > 0) summary += ` (${applied.failures.length} of ${result.operations.length} changes could not be made: ${applied.failures[0]})`;
      if (summary) add({ role: "assistant", content: summary });
      if (result.remember) add({ role: "assistant", content: "", remember: { fact: result.remember, state: "ready" } });
      for (const request of applied.requests) await handle(request);
      setBusy(false);
    },
    [messages, busy, add, handle],
  );

  const confirmScene = useCallback(
    async (id: string): Promise<void> => {
      const scene = messages.find((m) => m.id === id)?.scene;
      if (!scene || scene.state !== "ready") return;
      patchScene(id, { state: "working", message: undefined });
      // The message id doubles as the idempotency key, so a double press makes one scene.
      const started = await startScene({ prompt: scene.prompt, seconds: scene.seconds, key: `scene-${id}` });
      if (!started.ok) return patchScene(id, { state: "failed", message: started.message, code: started.code });

      const deadline = Date.now() + SCENE_TIMEOUT_MS;
      while (alive.current && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        const status = await sceneStatus(started.jobId);
        if (status.state === "failed") return patchScene(id, { state: "failed", message: status.message });
        if (status.state === "done") {
          // The provider's link expires and cannot be exported from, so the clip is copied first.
          const copied = await adoptVideo(started.jobId);
          if (!copied.ok) return patchScene(id, { state: "failed", message: copied.message, code: copied.code });
          const placed = placeGeneratedVideo(copied.mediaId, scene.seconds, "AI scene");
          if (placed.error) return patchScene(id, { state: "failed", message: placed.error });
          return patchScene(id, { state: "done" });
        }
      }
      if (alive.current) patchScene(id, { state: "failed", message: "This is taking longer than expected. It will appear in your Library when it finishes." });
    },
    [messages, patchScene],
  );

  return {
    messages,
    busy,
    error,
    errorCode,
    send,
    confirmScene,
    dismissScene: (id) => patchScene(id, { state: "dismissed" }),
    confirmRemember,
    dismissRemember: (id) => patchRemember(id, { state: "dismissed" }),
    clear: () => setMessages([]),
  };
}
