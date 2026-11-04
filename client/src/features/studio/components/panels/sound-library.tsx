"use client";

import { useEffect } from "react";

import { type Asset } from "../../core/types.ts";
import { SOUNDS, soundRef, soundUrl } from "../../lib/sounds";
import { useStudio } from "../../store/editor-store";
import { AssetRow } from "./asset-row";

const asset = (sound: (typeof SOUNDS)[number]): Asset => ({ src: soundRef(sound.id), name: sound.name, kind: "audio", duration: sound.seconds });

/** The built-in sounds and music. They are made when the panel opens, so each can be played at once. */
export function SoundLibrary() {
  useEffect(() => {
    for (const sound of SOUNDS) {
      void soundUrl(sound.id)
        .then((url) => useStudio.getState().setMediaUrls({ [soundRef(sound.id)]: url }))
        .catch(() => undefined);
    }
  }, []);

  return (
    <div className="space-y-3 border-t border-hairline pt-3">
      {(["Effects", "Music"] as const).map((category) => (
        <section key={category} aria-label={category}>
          <h3 className="mb-1.5 text-xs text-ink-soft">{category}</h3>
          <ul className="space-y-1.5">
            {SOUNDS.filter((s) => s.category === category).map((sound) => (
              <AssetRow key={sound.id} asset={asset(sound)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
