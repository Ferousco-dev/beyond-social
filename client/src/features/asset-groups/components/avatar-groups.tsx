"use client";

import { Plus } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { OptionSheet } from "@/features/new-video/components/option-sheet";
import type { AssetGroup, AssetGroupDetail } from "@/lib/go-api/schemas";

import { createAssetGroup, deleteAssetGroup, getAssetGroup } from "../actions";
import { asDetail, cachedGroup, forgetGroup, rememberGroup } from "../group-cache";
import { GroupDetailView } from "./group-detail";

const TEMP = "temp-";

function summary(group: AssetGroupDetail): AssetGroup {
  const { extra_views: _views, face_view: _f, voice_view: _v, product_view: _p, environment_view: _e, ...rest } = group;
  void [_views, _f, _v, _p, _e];
  return rest;
}

function filled(group: AssetGroup): number {
  return [group.slots.face, group.slots.voice, group.slots.product, group.slots.environment].filter((slot) => slot !== "").length;
}

/**
 * The avatar groups: a card per group, each opening in a popup (a modal on
 * desktop, a sheet you drag down on a phone). Everything answers at once: a new
 * group appears and opens before the server has made it, a rename or delete
 * shows immediately, and a group opened before paints from memory.
 */
export function AvatarGroups({ initial }: { initial: readonly AssetGroup[] }): ReactNode {
  const [groups, setGroups] = useState<readonly AssetGroup[]>(initial);
  const [open, setOpen] = useState<AssetGroupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const openId = useRef<string | null>(null);

  function show(group: AssetGroupDetail): void {
    openId.current = group.id;
    setOpen(group);
  }

  function select(group: AssetGroup): void {
    setError(null);
    show(cachedGroup(group.id) ?? asDetail(group));
    void getAssetGroup(group.id).then((result) => {
      if (result.status !== "ok") return;
      rememberGroup(result.group);
      if (openId.current === group.id) setOpen(result.group);
    });
  }

  function warm(group: AssetGroup): void {
    if (cachedGroup(group.id)) return;
    void getAssetGroup(group.id).then((result) => {
      if (result.status === "ok") rememberGroup(result.group);
    });
  }

  function create(): void {
    setError(null);
    const now = new Date().toISOString();
    const temp: AssetGroup = {
      id: `${TEMP}${Date.now()}`,
      name: "New group",
      slots: { face: "", voice: "", product: "", environment: "" },
      extras: [],
      face_consent_at: null,
      voice_consent_at: null,
      created_at: now,
      updated_at: now,
    };
    setGroups((current) => [...current, temp]);
    show(asDetail(temp));
    void createAssetGroup("").then((result) => {
      if (result.status !== "ok") {
        setGroups((current) => current.filter((group) => group.id !== temp.id));
        if (openId.current === temp.id) close();
        setError(result.status === "unconfigured" ? "The service is not available right now. Try again in a few minutes." : result.message);
        return;
      }
      const real = result.group;
      rememberGroup(asDetail(real));
      setGroups((current) => current.map((group) => (group.id === temp.id ? real : group)));
      if (openId.current === temp.id) show(asDetail(real));
    });
  }

  function close(): void {
    openId.current = null;
    setOpen(null);
  }

  function changed(group: AssetGroupDetail): void {
    rememberGroup(group);
    setGroups((current) => current.map((item) => (item.id === group.id ? summary(group) : item)));
  }

  function remove(group: AssetGroupDetail): void {
    const before = groups;
    setGroups((current) => current.filter((item) => item.id !== group.id));
    forgetGroup(group.id);
    close();
    void deleteAssetGroup(group.id).then((result) => {
      if (result.status === "ok") return;
      setGroups(before);
      setError(result.message);
    });
  }

  return (
    <>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {groups.map((group) => (
          <li key={group.id}>
            <button
              type="button"
              onClick={() => select(group)}
              onPointerEnter={() => warm(group)}
              className="flex h-full w-full cursor-pointer flex-col rounded-2xl border border-hairline bg-paper p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="block text-sm font-semibold text-ink">{group.name}</span>
              <span className="mt-1 block text-xs text-ink-soft">{filled(group)} of 4 slots filled</span>
              <span className="mt-3 flex gap-1" aria-hidden>
                {[0, 1, 2, 3].map((index) => (
                  <span key={index} className={`h-1.5 flex-1 rounded-full ${index < filled(group) ? "bg-primary" : "bg-hairline"}`} />
                ))}
              </span>
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={create}
            className="flex h-full min-h-24 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-hairline bg-cloud/40 p-4 text-sm font-medium text-ink-soft transition-colors hover:border-primary/50 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Plus className="size-5" aria-hidden />
            New group
          </button>
        </li>
      </ul>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <OptionSheet
        open={open !== null}
        title={open?.name ?? ""}
        description="Fill the slots, confirm consent for face and voice, then use it in a video."
        onClose={close}
      >
        {open ? (
          <GroupDetailView
            key={open.id}
            initial={open}
            pending={open.id.startsWith(TEMP)}
            onChange={changed}
            onDelete={remove}
          />
        ) : null}
      </OptionSheet>
    </>
  );
}
