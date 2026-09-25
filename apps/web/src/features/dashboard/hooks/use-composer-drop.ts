"use client";

import { useCallback, useState, type Dispatch, type DragEvent, type SetStateAction } from "react";

import { type PendingPhoto } from "../components/compose-menu";
import { useFootageUpload, type PendingFootage } from "./use-footage-upload";
import { usePhotoUpload } from "./use-photo-upload";
import { useVoiceUpload, type PendingVoice } from "./use-voice-upload";

/**
 * Dropping a file straight onto the composer.
 *
 * Sorted to the same upload path its type already has a button for in
 * `ComposeMenu`: a picture becomes a photo, a clip becomes footage, a
 * recording becomes a voice clip. Photos accept every image in the drop at
 * once, the same as the file picker does; footage and voice take the first
 * match only, since the composer only ever holds one of each at a time.
 */
interface Options {
  projectId: string;
  onPhotos: Dispatch<SetStateAction<readonly PendingPhoto[]>>;
  onVoice: (voice: PendingVoice) => void;
  onFootage: (footage: PendingFootage) => void;
  onError: (message: string) => void;
  onBusyChange: (busy: boolean) => void;
}

export function useComposerDrop({
  projectId,
  onPhotos,
  onVoice,
  onFootage,
  onError,
  onBusyChange,
}: Options) {
  const [dragging, setDragging] = useState(false);
  const photo = usePhotoUpload({ projectId, onPhotos, onError, onBusyChange });
  const voice = useVoiceUpload({ projectId, onVoice, onError, onBusyChange });
  const footage = useFootageUpload({ onFootage, onError, onBusyChange });

  const onDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    // Only react to a real file drag, not text selected and dragged from the
    // page, which also fires these events but has nothing this can accept.
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    // dragenter/dragleave fire on every child boundary crossed, not just the
    // composer's own edge, so clearing unconditionally made the highlight
    // flicker off while the pointer was still over an inner element.
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setDragging(false);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      setDragging(false);

      const files = Array.from(event.dataTransfer.files);
      if (files.length === 0) return;

      const images = files.filter((file) => file.type.startsWith("image/"));
      const video = files.find((file) => file.type.startsWith("video/"));
      const audio = files.find((file) => file.type.startsWith("audio/"));

      if (images.length > 0) photo.upload(images);
      if (video) footage.upload(video);
      if (audio) voice.upload(audio);

      if (images.length === 0 && !video && !audio) {
        onError("That file type isn't supported here. Try an image, a video, or an audio clip.");
      }
    },
    [photo, footage, voice, onError],
  );

  return { dragging, onDragOver, onDragLeave, onDrop };
}
