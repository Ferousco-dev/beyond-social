"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";

import { takeSeed } from "@/lib/composer/seed";

import { type PendingPhoto } from "../components/compose-menu";
import { type PendingFootage } from "./use-footage-upload";
import { type PendingVoice } from "./use-voice-upload";
import { type PendingShot } from "../components/shot-list-editor";

/**
 * What is in the composer but not yet sent.
 *
 * Six pieces of state that only ever change together: they are filled by one
 * person composing one message, and every one of them is cleared the moment it
 * is sent. Held apart in the thread component, they read as six unrelated
 * things and every send had to remember to reset all of them.
 *
 * Footage is here but is not an attachment. It is an input to the render rather
 * than something the thread shows back, so it never becomes a message
 * attachment, and it is cleared on send like the rest.
 */

export interface ComposerDraft {
  readonly prompt: string;
  readonly setPrompt: (value: string) => void;
  readonly photos: readonly PendingPhoto[];
  readonly setPhotos: Dispatch<SetStateAction<readonly PendingPhoto[]>>;
  readonly voice: PendingVoice | null;
  readonly setVoice: Dispatch<SetStateAction<PendingVoice | null>>;
  readonly footage: PendingFootage | null;
  readonly setFootage: Dispatch<SetStateAction<PendingFootage | null>>;
  readonly shots: readonly PendingShot[] | null;
  readonly setShots: Dispatch<SetStateAction<readonly PendingShot[] | null>>;
  /** True when it was filled from elsewhere and has not been sent yet. */
  readonly seeded: boolean;
  /** Everything the composer holds, emptied. Called as a turn is sent. */
  readonly clear: () => void;
}

export function useComposerDraft(
  /** Null while the project does not exist yet, which is when a seed arrives. */
  projectId: string | null,
): ComposerDraft {
  const [prompt, setPrompt] = useState("");
  const [photos, setPhotos] = useState<readonly PendingPhoto[]>([]);
  const [voice, setVoice] = useState<PendingVoice | null>(null);
  const [footage, setFootage] = useState<PendingFootage | null>(null);
  const [shots, setShots] = useState<readonly PendingShot[] | null>(null);
  const [seeded, setSeeded] = useState(false);

  /**
   * Seeded from the dashboard composer, a brief, or a post in Discover.
   *
   * The composer is filled and left alone. This used to submit the seed on
   * mount, which meant one tap on "Use as inspiration" while scrolling started
   * a render: the user arrived at a thread where their credits had already been
   * spent on a prompt they had not read. Credits do not come back, so the send
   * has to be something a person did on purpose.
   */
  useEffect(() => {
    if (projectId !== null) return;

    // The query string still wins, because a link into a new thread with a
    // prompt on it is a shareable thing and storage is not.
    const seed = takeSeed(new URLSearchParams(window.location.search).get("prompt"));
    if (seed.prompt === null) return;

    if (seed.photos) setPhotos(seed.photos);
    if (seed.shots) setShots(seed.shots);

    setPrompt(seed.prompt);
    setSeeded(true);
    // A one-shot seed. Only state setters are called, so there is nothing else
    // to depend on.
  }, [projectId]);

  const clear = useCallback(() => {
    setPrompt("");
    setPhotos([]);
    setVoice(null);
    setFootage(null);
    setShots(null);
    setSeeded(false);
  }, []);

  return {
    prompt,
    setPrompt: useCallback((value: string) => {
      setPrompt(value);
      // Typing over a seeded brief makes it theirs, so the screen stops
      // explaining where it came from.
      setSeeded(false);
    }, []),
    photos,
    setPhotos,
    voice,
    setVoice,
    footage,
    setFootage,
    shots,
    setShots,
    seeded,
    clear,
  };
}
