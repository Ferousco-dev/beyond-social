import "server-only";

import { type createClient } from "@/lib/supabase/server";

/**
 * Telling the generator that a picture is a thing somebody sells.
 *
 * A saved product arrives as an ordinary photo attachment, which means the
 * generator treated it as loose inspiration: it would produce something in the
 * spirit of the picture rather than featuring the object in it. For a reference
 * shot of a hoodie that is exactly wrong, because the whole point is that the
 * hoodie in the video is the hoodie they sell.
 *
 * The lookup is by storage path against `brand_assets`, so this is decided from
 * what the user actually saved rather than from a flag the client sends. A
 * client-supplied "this is a product" would let a photo of a person be
 * relabelled, which is the same hole the likeness gate exists to close.
 */

export interface SavedSubjects {
  readonly productLabels: readonly string[];
  readonly hasAvatar: boolean;
}

const NONE: SavedSubjects = { productLabels: [], hasAvatar: false };

export async function findSavedSubjects(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: readonly string[],
): Promise<SavedSubjects> {
  if (paths.length === 0) return NONE;

  // Row-level security scopes this to the caller, so a path that happens to
  // match somebody else's saved asset returns nothing.
  const { data } = await supabase
    .from("brand_assets")
    .select("kind, label")
    .in("storage_path", [...paths]);

  const rows = (data ?? []) as { kind: string; label: string }[];

  return {
    productLabels: rows
      .filter((row) => row.kind === "product")
      .map((row) => row.label.trim())
      .filter((label) => label !== ""),
    hasAvatar: rows.some((row) => row.kind === "avatar"),
  };
}

/**
 * The direction a saved subject adds to a brief.
 *
 * Written as instruction rather than description, because it is going to a
 * generator and "the attached image is a product" is a fact it can ignore where
 * "feature this exact product" is a constraint it cannot.
 *
 * Empty when there is nothing saved in the turn, so an ordinary photo keeps
 * behaving exactly as it did.
 */
export function describeSavedSubjects(subjects: SavedSubjects): string {
  const lines: string[] = [];

  if (subjects.productLabels.length > 0) {
    const named = subjects.productLabels.join(", ");
    lines.push(
      `Feature the exact product in the attached reference image, unchanged: ${named}. Its shape, colour, markings and proportions must match the reference. Do not redesign it or substitute something similar.`,
    );
  }

  if (subjects.hasAvatar) {
    lines.push(
      "The person in the attached reference image is the creator. Keep their face and build recognisably the same.",
    );
  }

  return lines.join("\n");
}
