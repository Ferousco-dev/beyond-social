"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { adoptVideo, askAssistant, quoteScene, sceneStatus, startScene, watchClip } from "../assist-actions";
import { applyOperations, type Request } from "../core/assist.ts";
import { describeProject } from "../core/describe.ts";
import { endOf, locate } from "../core/find.ts";
import { addAsset, addItem } from "../core/ops.ts";
import { makeId } from "../lib/format";
import { mediaRef, resolveSrc } from "../lib/media-ref";
import { useStudio } from "../store/editor-store";

export interface SceneProposal {
  readonly prompt: string;
  readonly seconds: number;
  /** What it will cost, or null if the price could not be read. */
  readonly credits: number | null;
  readonly state: "ready" | "working" | "done" | "failed" | "dismissed";
  readonly message?: string;
}

export interface AssistantMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly scene?: SceneProposal;
}

const HISTORY_TURNS = 10;
const POLL_MS = 4000;
const SCENE_TIMEOUT_MS = 8 * 60 * 1000;

interface Assistant {
  messages: readonly AssistantMessage[];
  busy: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
  confirmScene: (id: string) => Promise<void>;
  dismissScene: (id: string) => void;
  clear: () => void;
}

export function useAssistant(): Assistant {
  const [messages, setMessages] = useState<readonly AssistantMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      if (!started.ok) return patchScene(id, { state: "failed", message: started.message });

      const deadline = Date.now() + SCENE_TIMEOUT_MS;
      while (alive.current && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        const status = await sceneStatus(started.jobId);
        if (status.state === "failed") return patchScene(id, { state: "failed", message: status.message });
        if (status.state === "done") {
          // The provider's link expires and cannot be exported from, so the clip is copied first.
          const copied = await adoptVideo(started.jobId);
          if (!copied.ok) return patchScene(id, { state: "failed", message: copied.message });
          const clipId = makeId();
          const store = useStudio.getState();
          const src = mediaRef(copied.mediaId);
          const track = store.history.present.tracks.find((t) => t.kind === "video");
          const start = track?.items.reduce((latest, i) => Math.max(latest, endOf(i)), 0) ?? 0;
          const error = store.edit((p) => {
            const withAsset = addAsset(p, { src, name: "AI scene", kind: "video", duration: scene.seconds });
            return withAsset.ok
              ? addItem(withAsset.value, track?.id ?? "video", { kind: "video", id: clipId, start, duration: scene.seconds, src, trimIn: 0, sourceDuration: scene.seconds, volume: 1 })
              : withAsset;
          });
          if (error) return patchScene(id, { state: "failed", message: error });
          store.select(clipId);
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
    send,
    confirmScene,
    dismissScene: (id) => patchScene(id, { state: "dismissed" }),
    clear: () => setMessages([]),
  };
}
