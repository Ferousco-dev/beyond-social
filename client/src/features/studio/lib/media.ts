/** Reads a video's length from its metadata. Rejects if the address cannot be played. */
export function probeDuration(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const seconds = video.duration;
      video.removeAttribute("src");
      if (Number.isFinite(seconds) && seconds > 0) resolve(seconds);
      else reject(new Error("That video has no length."));
    };
    video.onerror = () => reject(new Error("That video could not be loaded."));
    video.src = src;
  });
}
