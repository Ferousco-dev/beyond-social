"use client";

import { useCallback, useState } from "react";

import { uploadGroupFile } from "@/features/asset-groups/upload";

import { consentLibraryAsset, createLibraryAsset, deleteLibraryAsset, relabelLibraryAsset } from "./actions";
import type { AssetKind, LibraryAsset } from "./types";
import { invalidateLibrary } from "./use-library";

/** An asset on screen: saved, or still uploading with a local preview. */
export type ShownAsset = LibraryAsset & { readonly pending?: boolean };

/**
 * The library with every change shown at once: uploads appear with a local
 * preview while they travel, and edits apply before the server answers,
 * rolling back with a message if it refuses.
 */
export function useAssetLibrary(initial: readonly LibraryAsset[]) {
  const [assets, setAssets] = useState<readonly ShownAsset[]>(initial);
  const [error, setError] = useState<string | null>(null);

  const replace = useCallback((id: string, next: ShownAsset | null) => {
    setAssets((current) => (next ? current.map((a) => (a.id === id ? next : a)) : current.filter((a) => a.id !== id)));
  }, []);

  const add = useCallback(
    async (kind: AssetKind, label: string, file: File): Promise<boolean> => {
      setError(null);
      const tempId = `pending-${crypto.randomUUID()}`;
      const preview = URL.createObjectURL(file);
      const fileKind = file.type.split("/")[0] ?? "";
      setAssets((current) => [
        { id: tempId, kind, label, media_id: "", consent_at: null, created_at: new Date().toISOString(), file_kind: fileKind, url: preview, pending: true },
        ...current,
      ]);
      const uploaded = await uploadGroupFile(file);
      const created = uploaded.status === "ok" ? await createLibraryAsset({ kind, label, mediaId: uploaded.mediaId }) : uploaded;
      URL.revokeObjectURL(preview);
      if (created.status !== "ok") {
        replace(tempId, null);
        setError(created.status === "unconfigured" ? "The backend is not connected yet." : created.message);
        return false;
      }
      replace(tempId, created.asset);
      invalidateLibrary();
      return true;
    },
    [replace],
  );

  const optimistic = useCallback(
    async (asset: ShownAsset, next: ShownAsset | null, call: () => Promise<{ status: string; message?: string }>) => {
      setError(null);
      replace(asset.id, next);
      const result = await call();
      if (result.status === "ok") {
        invalidateLibrary();
        return;
      }
      setAssets((current) => (next ? current.map((a) => (a.id === asset.id ? asset : a)) : [asset, ...current]));
      setError(result.message ?? "That did not save. Try again.");
    },
    [replace],
  );

  const relabel = useCallback(
    (asset: ShownAsset, label: string) => optimistic(asset, { ...asset, label }, () => relabelLibraryAsset(asset.id, label)),
    [optimistic],
  );
  const consent = useCallback(
    (asset: ShownAsset) =>
      optimistic(asset, { ...asset, consent_at: new Date().toISOString() }, () => consentLibraryAsset(asset.id)),
    [optimistic],
  );
  const remove = useCallback((asset: ShownAsset) => optimistic(asset, null, () => deleteLibraryAsset(asset.id)), [optimistic]);

  return { assets, error, dismissError: () => setError(null), add, relabel, consent, remove };
}
