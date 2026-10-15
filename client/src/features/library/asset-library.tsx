"use client";

import { createClient } from "@supabase/supabase-js";
import { FileAudio2, FileImage, FileVideo2, LoaderCircle, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { attachmentUrl, confirmAttachment, requestAttachmentUpload } from "@/features/conversation/media-actions";
import { env } from "@/lib/env";

const STORAGE_KEY = "beyond-social:asset-library:v1";
const MAX_BYTES: Record<"image" | "video" | "audio", number> = {
  image: 10 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
};
const entrySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  category: z.enum(["avatar", "product", "background", "voice", "other"]),
  mimeType: z.string().min(3).max(100),
  size: z.number().int().positive(),
  createdAt: z.string(),
});
type AssetEntry = z.infer<typeof entrySchema>;
type Category = AssetEntry["category"];

const CATEGORIES: ReadonlyArray<{ value: Category; label: string }> = [
  { value: "avatar", label: "Character" },
  { value: "product", label: "Product" },
  { value: "background", label: "Background" },
  { value: "voice", label: "Voice" },
  { value: "other", label: "Other" },
];

function mediaKind(mimeType: string): "image" | "video" | "audio" | null {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return null;
}

function prettySize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssetLibrary(): ReactNode {
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceId = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [entries, setEntries] = useState<AssetEntry[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Category | "all">("all");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = z.array(entrySchema).safeParse(JSON.parse(raw) as unknown);
        if (parsed.success) setEntries(parsed.data);
        else setError("The saved asset list could not be read. Uploads in cloud storage were not changed.");
      }
    } catch {
      setError("Browser storage is unavailable. This asset list cannot be restored on this device.");
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      setError("The asset list could not be saved in this browser. Your uploaded files remain in storage.");
    }
  }, [entries, loaded]);

  useEffect(() => {
    let active = true;
    void Promise.all(entries.map(async (entry) => [entry.id, await attachmentUrl(entry.id)] as const))
      .then((results) => {
        if (!active) return;
        setPreviews(Object.fromEntries(results.filter((result): result is readonly [string, string] => result[1] !== null)));
        if (results.some(([, url]) => url === null) && entries.length > 0) {
          setError("Some saved file previews could not be refreshed. The files remain in your account storage.");
        }
      })
      .catch(() => {
        if (active) setError("File previews could not be refreshed because of a connection problem.");
      });
    return () => {
      active = false;
    };
  }, [entries]);

  const chooseFile = useCallback((category?: Category, id?: string) => {
    replaceId.current = id ?? null;
    if (category) setPendingCategory(category);
    else setPendingCategory("other");
    inputRef.current?.click();
  }, []);
  const [pendingCategory, setPendingCategory] = useState<Category>("other");

  async function uploadFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setError(null);
    setNotice(null);
    const kind = mediaKind(file.type.split(";")[0]?.toLowerCase() ?? "");
    if (!kind) {
      setError("Choose a JPEG, PNG, WebP, MP4, QuickTime, WebM, MP3, WAV, or OGG file.");
      return;
    }
    if (file.size > MAX_BYTES[kind]) {
      setError(`${kind[0]?.toUpperCase()}${kind.slice(1)} files must be ${prettySize(MAX_BYTES[kind])} or smaller.`);
      return;
    }

    setBusy(true);
    try {
      const mimeType = file.type.split(";")[0]?.toLowerCase() ?? file.type;
      const slot = await requestAttachmentUpload({ name: file.name.slice(0, 200) || "upload", mimeType, size: file.size });
      if (slot.status !== "ok") {
        setError(slot.message);
        return;
      }
      const storage = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      const uploaded = await storage.storage.from("user-media").uploadToSignedUrl(slot.path, slot.token, file, { contentType: mimeType });
      if (uploaded.error) {
        setError(`Upload failed: ${uploaded.error.message}`);
        return;
      }
      const confirmed = await confirmAttachment(slot.id);
      if (confirmed.status !== "ok") {
        setError(confirmed.message);
        return;
      }

      const next: AssetEntry = {
        id: confirmed.attachment.id,
        name: file.name.slice(0, 120) || "Untitled asset",
        category: pendingCategory,
        mimeType,
        size: file.size,
        createdAt: new Date().toISOString(),
      };
      const previousId = replaceId.current;
      setEntries((current) => previousId
        ? [next, ...current.filter((entry) => entry.id !== previousId)]
        : [next, ...current]);
      replaceId.current = null;
      const preview = await attachmentUrl(next.id);
      if (preview) {
        setPreviews((current) => ({ ...current, [next.id]: preview }));
      } else {
        setError("Upload succeeded, but a preview link could not be loaded. The file remains in account storage.");
      }
      setNotice(previousId
        ? "Replacement uploaded. The previous stored file remains in account storage because permanent deletion is not available yet."
        : "Uploaded. This browser keeps the asset list; the signed-in account stores the file.");
    } catch {
      setError("The upload could not be completed because of a connection problem. Check the file before trying again.");
    } finally {
      replaceId.current = null;
      setBusy(false);
    }
  }

  function saveName(id: string): void {
    const name = renameValue.trim().slice(0, 120);
    if (!name) {
      setError("An asset name cannot be blank.");
      return;
    }
    setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, name } : entry));
    setRenameId(null);
    setNotice("Name updated in this browser. The storage file name was not changed.");
  }

  const shown = filter === "all" ? entries : entries.filter((entry) => entry.category === filter);

  return (
    <section aria-labelledby="assets-title" className="rounded-2xl border border-hairline bg-paper p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 id="assets-title" className="text-xl font-semibold text-ink">Media assets</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Upload product photos, backgrounds, voice references and other media. Files are stored in your account, but this categorized list and custom names are saved only in this browser.
          </p>
        </div>
        <Button type="button" onClick={() => chooseFile()} disabled={busy}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
          Add asset
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/ogg"
        className="sr-only"
        onChange={(event) => void uploadFile(event)}
      />

      <div className="mt-5 flex flex-wrap gap-2" aria-label="Filter assets by category">
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>All ({entries.length})</FilterButton>
        {CATEGORIES.map((category) => (
          <FilterButton key={category.value} active={filter === category.value} onClick={() => setFilter(category.value)}>
            {category.label} ({entries.filter((entry) => entry.category === category.value).length})
          </FilterButton>
        ))}
      </div>

      {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
      {notice ? <p role="status" className="mt-4 text-sm text-success">{notice}</p> : null}

      {shown.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-hairline px-4 py-10 text-center">
          <Upload className="mx-auto size-5 text-ink-soft" aria-hidden />
          <p className="mt-3 text-sm font-medium text-ink">{entries.length === 0 ? "No saved assets on this browser" : "No assets in this category"}</p>
          <p className="mt-1 text-xs text-ink-soft">Upload a file to add it to your categorized asset list.</p>
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((entry) => (
            <li key={entry.id} className="overflow-hidden rounded-xl border border-hairline bg-paper">
              <AssetPreview entry={entry} url={previews[entry.id]} />
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {renameId === entry.id ? (
                      <form onSubmit={(event) => { event.preventDefault(); saveName(entry.id); }} className="flex gap-1.5">
                        <input autoFocus className="min-h-9 min-w-0 flex-1 rounded-lg border border-hairline px-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-primary" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} aria-label="Asset name" maxLength={120} />
                        <Button type="submit" variant="secondary" size="sm">Save</Button>
                      </form>
                    ) : (
                      <>
                        <p className="truncate text-sm font-medium text-ink">{entry.name}</p>
                        <p className="mt-1 text-xs text-ink-soft">
                          {CATEGORIES.find((category) => category.value === entry.category)?.label} · {prettySize(entry.size)}
                        </p>
                      </>
                    )}
                  </div>
                  {renameId !== entry.id ? (
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-ink-soft hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
                      aria-label={`Rename ${entry.name}`}
                      onClick={() => { setRenameId(entry.id); setRenameValue(entry.name); }}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-ink-soft">{entry.mimeType}</span>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary"
                      onClick={() => chooseFile(entry.category, entry.id)}
                      disabled={busy}
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-ink-soft hover:bg-cloud hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
                      aria-label={`Remove ${entry.name} from this browser`}
                      onClick={() => {
                        setEntries((current) => current.filter((item) => item.id !== entry.id));
                        setPreviews((current) => {
                          const next = { ...current };
                          delete next[entry.id];
                          return next;
                        });
                        setNotice("Removed from this browser's list only. The stored file was not deleted.");
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs leading-relaxed text-ink-soft">
        The media API does not yet list or permanently delete account files. Use the same browser to see this categorized list. Removing an item here only hides it from the local list; replacing it leaves the previous stored file in account storage.
      </p>
    </section>
  );
}

function AssetPreview({ entry, url }: { readonly entry: AssetEntry; readonly url?: string }): ReactNode {
  const kind = mediaKind(entry.mimeType);
  return (
    <div className="flex aspect-video items-center justify-center overflow-hidden bg-cloud">
      {url && kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={entry.name} className="size-full object-cover" />
      ) : url && kind === "video" ? (
        <video src={url} controls preload="metadata" className="size-full object-contain" aria-label={entry.name} />
      ) : url && kind === "audio" ? (
        <div className="w-full px-4">
          <FileAudio2 className="mx-auto mb-3 size-7 text-ink-soft" aria-hidden />
          <audio src={url} controls preload="metadata" className="w-full" aria-label={entry.name} />
        </div>
      ) : kind === "image" ? <FileImage className="size-8 text-ink-soft" aria-hidden />
        : kind === "video" ? <FileVideo2 className="size-8 text-ink-soft" aria-hidden />
          : <FileAudio2 className="size-8 text-ink-soft" aria-hidden />}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-9 rounded-full border px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        active ? "border-primary bg-primary/5 text-primary" : "border-hairline text-ink-soft hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
