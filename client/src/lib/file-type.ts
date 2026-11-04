// Other names browsers and operating systems give the same formats (macOS
// calls an .m4a file audio/x-m4a). Storage and the server accept only the
// standard names, so every upload is sent under those.
const ALIASES: Readonly<Record<string, string>> = {
  "audio/x-m4a": "audio/mp4",
  "audio/m4a": "audio/mp4",
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/vnd.wave": "audio/wav",
  "audio/mp3": "audio/mpeg",
  "image/jpg": "image/jpeg",
};

/** A file's type under its standard name, without parameters such as codecs. */
export function standardType(type: string): string {
  const base = (type.split(";")[0] ?? "").trim().toLowerCase();
  return ALIASES[base] ?? base;
}

/**
 * The same file labelled with its standard type. Supabase Storage sends a
 * File with its own type and ignores any contentType option, so a file the
 * operating system named "audio/x-m4a" has to be relabelled to upload.
 */
export function withStandardType(file: File): File {
  const type = standardType(file.type);
  return type === file.type ? file : new File([file], file.name, { type, lastModified: file.lastModified });
}
