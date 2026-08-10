"use server";

import { getBrandLibrary, type BrandLibrary } from "@/lib/assets/brand";

/**
 * The saved pictures, for the composer.
 *
 * A thin action over the server read, because the composer is a client component
 * and the signed URLs have to be minted per request. Nothing is cached: a link
 * that outlives its two hours renders as a broken thumbnail in the picker.
 */
export async function loadBrandLibrary(): Promise<BrandLibrary> {
  return getBrandLibrary();
}
