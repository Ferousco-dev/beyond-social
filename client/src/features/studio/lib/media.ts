// The media library is large and only needed when the browser cannot read a length itself, so it loads then.

/** Asks the browser's own player for the length. Cheap, but it cannot read every file. */
function lengthFromPlayer(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const seconds = video.duration;
      video.removeAttribute("src");
      // Some recordings (a phone's WebM, for one) report an endless length until the file is scanned.
      if (Number.isFinite(seconds) && seconds > 0) resolve(seconds);
      else reject(new Error("That video has no length."));
    };
    video.onerror = () => reject(new Error("That video could not be loaded."));
    video.src = src;
  });
}

/** Reads the length by scanning the file itself, which also covers files the player rejects. */
async function lengthFromFile(src: string, file?: File): Promise<number> {
  const { ALL_FORMATS, BlobSource, Input, UrlSource } = await import("mediabunny");
  const input = new Input({ source: file ? new BlobSource(file) : new UrlSource(src), formats: ALL_FORMATS });
  try {
    const seconds = await input.computeDuration();
    if (Number.isFinite(seconds) && seconds > 0) return seconds;
    throw new Error("That file has no length.");
  } finally {
    input.dispose();
  }
}

/**
 * Reads the length of a video or sound. The browser's player is tried first;
 * if it cannot say, the file is scanned instead (from `file` when the person
 * just picked it, otherwise from its address). Rejects only when neither can.
 */
export async function probeDuration(src: string, file?: File): Promise<number> {
  try {
    return await lengthFromPlayer(src);
  } catch {
    return lengthFromFile(src, file);
  }
}
