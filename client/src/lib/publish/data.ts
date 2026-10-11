import { Camera, MessageCircle, Music, Play, type LucideIcon } from "lucide-react";

export interface Platform {
  readonly id: string;
  readonly name: string;
  readonly icon: LucideIcon;
  readonly color: string;
}

export const PLATFORMS: readonly Platform[] = [
  {
    id: "tiktok",
    name: "TikTok",
    icon: Music,
    color: "#000000",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: Camera,
    color: "#E1306C",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: MessageCircle,
    color: "#1877F2",
  },
  {
    id: "youtube",
    name: "YouTube Shorts",
    icon: Play,
    color: "#FF0000",
  },
] as const;
