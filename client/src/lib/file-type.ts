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
  // Some browsers / operating systems report these non-standard variants.
  "image/x-png": "image/png",
  "image/pjpeg": "image/jpeg",
  "video/x-m4v": "video/mp4",
  "video/x-matroska": "video/webm",
};

// Extension → standard MIME, used when file.type is empty or unrecognised.
const EXT_MIME: Readonly<Record<string, string>> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
};

/**
 * Returns the last extension of a filename, lower-cased, without the dot.
 * e.g. "photo.jpeg" → "jpeg", "file.tar.gz" → "gz", "noext" → "".
 */
function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/**
 * A file's MIME type under its standard name, without parameters such as
 * codecs. Falls back to the file extension when the browser reports an empty
 * or unrecognised type (some OS/browser combinations omit it for PNG/JPG).
 */
export function standardType(type: string, filename = ""): string {
  const base = (type.split(";")[0] ?? "").trim().toLowerCase();
  const canonical = ALIASES[base] ?? base;
  if (canonical) return canonical;
  // The browser gave nothing useful, so infer it from the file extension.
  return EXT_MIME[fileExtension(filename)] ?? "";
}

/**
 * The same file labelled with its standard type. Supabase Storage sends a
 * File with its own type and ignores any contentType option, so a file the
 * operating system named "audio/x-m4a" has to be relabelled to upload.
 */
export function withStandardType(file: File): File {
  const type = standardType(file.type, file.name);
  return type === file.type ? file : new File([file], file.name, { type, lastModified: file.lastModified });
}
