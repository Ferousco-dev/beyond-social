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
    void loadBrandLibrary().then((result) => {
      if (cancelled) return;
      setLibrary(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const has = library.avatar !== null || library.products.length > 0;
  return { library, loading, has };
}
