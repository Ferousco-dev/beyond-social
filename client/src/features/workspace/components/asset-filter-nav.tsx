"use client";

import {
  AudioLines,
  FolderUp,
  Image as ImageIcon,
  LayoutGrid,
  PersonStanding,
  Smile,
  Video,
} from "lucide-react";

import { cn } from "@/lib/utils";

export const ASSET_FILTERS = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "image", label: "Images", icon: ImageIcon },
  { id: "video", label: "Videos", icon: Video },
  { id: "voice", label: "Voices", icon: AudioLines },
  { id: "character", label: "Characters", icon: PersonStanding },
  { id: "avatar", label: "Avatars", icon: Smile },
  { id: "upload", label: "Uploads", icon: FolderUp },
] as const;

export type AssetFilterId = (typeof ASSET_FILTERS)[number]["id"];

export function AssetFilterNav({
  filter,
  onChange,
}: {
  filter: AssetFilterId;
  onChange: (filter: AssetFilterId) => void;
}) {
  return (
    <>
      {ASSET_FILTERS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          aria-pressed={filter === item.id}
          className={cn(
            "flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            filter === item.id
              ? "bg-cloud font-medium text-ink"
              : "text-ink-soft hover:bg-cloud/60 hover:text-ink",
          )}
        >
          <item.icon className="size-4" aria-hidden />
          {item.label}
        </button>
      ))}
    </>
  );
}
