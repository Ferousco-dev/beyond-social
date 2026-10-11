import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";

/**
 * The pictures a user keeps: their avatar, and their products.
 *
 * Signed on every read rather than stored as links. The uploads bucket is
 * private and a signed URL lasts two hours, so a stored one would render today
 * and break tomorrow, the same reasoning as message attachments and renders.
 */

export const BRAND_ASSET_KINDS = ["avatar", "product"] as const;
export type BrandAssetKind = (typeof BRAND_ASSET_KINDS)[number];

export interface BrandAsset {
  readonly id: string;
  readonly kind: BrandAssetKind;
  readonly path: string;
  readonly label: string;
  /** Null when the object could not be signed, so the UI can say so. */
  readonly url: string | null;
  readonly createdAt: string;
}

export interface BrandLibrary {
  /** Null when the user has not saved a likeness. Never more than one. */
  readonly avatar: BrandAsset | null;
  readonly products: readonly BrandAsset[];
}

const EMPTY: BrandLibrary = { avatar: null, products: [] };

/** Two hours, matching the other uploads: long enough to browse and pick. */
const SIGNED_URL_TTL_SECONDS = 2 * 60 * 60;

const rowSchema = z.object({
  id: z.string(),
  kind: z.enum(BRAND_ASSET_KINDS),
  storage_path: z.string().min(1),
  label: z.string().default(""),
  created_at: z.string(),
});

export async function getBrandLibrary(): Promise<BrandLibrary> {
  if (!isSupabaseConfigured) return EMPTY;

  const user = await getAuthUser();
  if (!user) return EMPTY;

  const supabase = await createClient();
  const { data } = await supabase
    .from("brand_assets")
    .select("id, kind, storage_path, label, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows = z.array(rowSchema).safeParse(data ?? []);
  if (!rows.success) return EMPTY;

  // Signed in one call rather than per row: a catalogue of twenty products
  // would otherwise put twenty round trips in front of the page.
  const { data: signed } = await supabase.storage.from("uploads").createSignedUrls(
    rows.data.map((row) => row.storage_path),
    SIGNED_URL_TTL_SECONDS,
  );

  // A failure comes back in the array with a null `signedUrl` rather than being
  // omitted, so the response is read by path and both fields are checked.
  const urls = new Map(
    (signed ?? [])
      .filter(
        (entry): entry is typeof entry & { path: string; signedUrl: string } =>
          typeof entry.path === "string" && typeof entry.signedUrl === "string",
      )
      .map((entry) => [entry.path, entry.signedUrl]),
  );

  const assets: BrandAsset[] = rows.data.map((row) => ({
    id: row.id,
    kind: row.kind,
    path: row.storage_path,
    label: row.label,
    url: urls.get(row.storage_path) ?? null,
    createdAt: row.created_at,
  }));

  return {
    avatar: assets.find((asset) => asset.kind === "avatar") ?? null,
    products: assets.filter((asset) => asset.kind === "product"),
  };
}
