import {
  AudioLines,
  ImageIcon,
  MessageSquare,
  UserRound,
  Video,
  type LucideIcon,
} from "lucide-react";

import { type PlanId } from "@/lib/billing/plans";
import { type CatalogModel, type ModelFamily } from "@/lib/models/types";

/**
 * What the market needs to render a model, on top of the catalogue row.
 *
 * Access is resolved once on the server and carried on the model, so a card
 * never has to reason about plans or balances. The database keeps enforcing
 * both dials at run time through `can_run_model`; this is display only, and it
 * must never be the thing that decides whether a run proceeds.
 */

export type ModelAccess =
  /** Plan allows it and the balance covers a run. */
  | { readonly state: "ready" }
  /** Plan allows it; the balance does not cover a run. Topping up fixes it. */
  | { readonly state: "no_credits"; readonly balance: number }
  /** The plan is too low. No amount of credits unlocks it. */
  | { readonly state: "locked"; readonly requiredPlan: PlanId };

export interface MarketModel extends CatalogModel {
  readonly access: ModelAccess;
  /** True when this is the user's stored default for its family. */
  readonly isPreferred: boolean;
}

interface FamilyMeta {
  readonly label: string;
  readonly icon: LucideIcon;
}

export const FAMILY_META: Readonly<Record<ModelFamily, FamilyMeta>> = {
  video: { label: "Video", icon: Video },
  avatar: { label: "Avatar", icon: UserRound },
  image: { label: "Image", icon: ImageIcon },
  chat: { label: "Text", icon: MessageSquare },
  audio: { label: "Audio", icon: AudioLines },
};

export function creditLabel(cost: number): string {
  return cost === 1 ? "1 credit" : `${cost} credits`;
}
