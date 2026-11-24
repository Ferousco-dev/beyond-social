"use client";

import { useCallback, useState } from "react";

import { deferWithUndo } from "@/components/ui/undo-toast";
import { uploadGroupFile } from "@/features/asset-groups/upload";

import {
  assignLibraryGroup,
  consentLibraryAsset,
  createLibraryAsset,
  createLibraryGroup,
  deleteLibraryAsset,
  deleteLibraryGroup,
  relabelLibraryAsset,
  renameLibraryGroup,
} from "./actions";
import type { AssetKind, LibraryAsset, LibraryGroup } from "./types";
import { invalidateLibrary } from "./use-library";

/** An asset on screen: saved, or still uploading with a local preview. */
export type ShownAsset = LibraryAsset & { readonly pending?: boolean };

/**
 * The library with every change shown at once: uploads appear with a local
 * preview while they travel, and edits apply before the server answers,
 * rolling back with a message if it refuses.
 */
export function useAssetLibrary(initial: readonly LibraryAsset[], initialGroups: readonly LibraryGroup[] = []) {
  const [assets, setAssets] = useState<readonly ShownAsset[]>(initial);
  const [groups, setGroups] = useState<readonly LibraryGroup[]>(initialGroups);
  const [error, setError] = useState<string | null>(null);

  const replace = useCallback((id: string, next: ShownAsset | null) => {
    setAssets((current) => (next ? current.map((a) => (a.id === id ? next : a)) : current.filter((a) => a.id !== id)));
  }, []);

  const add = useCallback(
    async (kind: AssetKind, label: string, file: File, groupId: string | null = null): Promise<boolean> => {
      setError(null);
      const tempId = `pending-${crypto.randomUUID()}`;
      const preview = URL.createObjectURL(file);
      const fileKind = file.type.split("/")[0] ?? "";
      setAssets((current) => [
        { id: tempId, kind, label, media_id: "", consent_at: null, created_at: new Date().toISOString(), file_kind: fileKind, url: preview, group_id: groupId, pending: true },
        ...current,
      ]);
      const uploaded = await uploadGroupFile(file);
      const created =
        uploaded.status === "ok" ? await createLibraryAsset({ kind, label, mediaId: uploaded.mediaId, ...(groupId ? { groupId } : {}) }) : uploaded;
      URL.revokeObjectURL(preview);
      if (created.status !== "ok") {
        replace(tempId, null);
        setError(created.status === "unconfigured" ? "The service is not available right now. Try again in a few minutes." : created.message);
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
  // Gone from the screen at once; deleted for real only after the Undo window passes.
  const remove = useCallback(
    (asset: ShownAsset): void => {
      setError(null);
      replace(asset.id, null);
      deferWithUndo({
        message: `“${asset.label}” deleted`,
        onUndo: () => setAssets((current) => (current.some((a) => a.id === asset.id) ? current : [asset, ...current])),
        commit: async () => {
          const result = await deleteLibraryAsset(asset.id);
          if (result.status === "ok") {
            invalidateLibrary();
            return null;
          }
          return `“${asset.label}” could not be deleted, so it was put back. ${result.status === "error" ? result.message : "The service is not available right now."}`;
        },
      });
    },
    [replace],
  );

  /** Moves an asset into a group, or out of any when groupId is null. */
  const move = useCallback(
    (asset: ShownAsset, groupId: string | null) =>
      optimistic(asset, { ...asset, group_id: groupId }, () => assignLibraryGroup(asset.id, groupId ?? "")),
    [optimistic],
  );

  /** Makes a group and returns it, or null with a message when it could not be made. */
  const createGroup = useCallback(async (name: string): Promise<LibraryGroup | null> => {
    setError(null);
    const result = await createLibraryGroup(name);
    if (result.status !== "ok") {
      setError(result.status === "error" ? result.message : "The service is not available right now. Try again in a few minutes.");
      return null;
    }
    setGroups((current) => [...current, result.group].sort((a, b) => a.name.localeCompare(b.name)));
    invalidateLibrary();
    return result.group;
  }, []);

  const renameGroup = useCallback(async (group: LibraryGroup, name: string): Promise<void> => {
    setError(null);
    setGroups((current) => current.map((g) => (g.id === group.id ? { ...g, name } : g)));
    const result = await renameLibraryGroup(group.id, name);
    if (result.status === "ok") {
      invalidateLibrary();
      return;
    }
    setGroups((current) => current.map((g) => (g.id === group.id ? group : g)));
    setError(result.status === "error" ? result.message : "That did not save. Try again.");
  }, []);

  // The group goes at once and its assets show as ungrouped; Undo brings both back.
  const removeGroup = useCallback((group: LibraryGroup): void => {
    setError(null);
    let members: readonly string[] = [];
    setAssets((current) => {
      members = current.filter((a) => a.group_id === group.id).map((a) => a.id);
      return current.map((a) => (a.group_id === group.id ? { ...a, group_id: null } : a));
    });
    setGroups((current) => current.filter((g) => g.id !== group.id));
    const restore = (): void => {
      setGroups((current) => (current.some((g) => g.id === group.id) ? current : [...current, group].sort((a, b) => a.name.localeCompare(b.name))));
      setAssets((current) => current.map((a) => (members.includes(a.id) ? { ...a, group_id: group.id } : a)));
    };
    deferWithUndo({
      message: `Group “${group.name}” deleted. Its assets are kept.`,
      onUndo: restore,
      commit: async () => {
        const result = await deleteLibraryGroup(group.id);
        if (result.status === "ok") {
          invalidateLibrary();
          return null;
        }
        restore();
        return `“${group.name}” could not be deleted, so it was put back.`;
      },
    });
  }, []);

  return {
    assets,
    groups,
    error,
    dismissError: () => setError(null),
    add,
    relabel,
    consent,
    remove,
    move,
    createGroup,
    renameGroup,
    removeGroup,
  };
}
