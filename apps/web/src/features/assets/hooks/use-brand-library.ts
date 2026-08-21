"use client";

import { useEffect, useState } from "react";

import { type BrandLibrary } from "@/lib/assets/brand";

import { loadBrandLibrary } from "../library-actions";

const EMPTY: BrandLibrary = { avatar: null, products: [] };

/**
 * The user's saved pictures, loaded once per mount.
 *
 * Fetched rather than passed down because the composer appears in several places
 * and threading a library through all of them would mean every one of those
 * pages loading it whether or not the menu is ever opened.
 */
export function useBrandLibrary() {
  const [library, setLibrary] = useState<BrandLibrary>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadBrandLibrary()
      .then((result) => {
        if (cancelled) return;
        setLibrary(result);
      })
      .catch(() => {
        // An unexpected server error rejects rather than resolving to EMPTY the
        // way every anticipated case already does. With no catch this left
        // `loading` stuck true forever: the menu that reads it never learns the
        // fetch is over, and the plus button's saved-pictures entry never
        // appears or disappears, it just never decides.
        if (!cancelled) setLibrary(EMPTY);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const has = library.avatar !== null || library.products.length > 0;
  return { library, loading, has };
}
