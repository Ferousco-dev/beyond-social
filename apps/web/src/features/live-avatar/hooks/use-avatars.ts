"use client";

import { useEffect, useState } from "react";
import { listTwins } from "../delete-actions";
import { type TwinSummary } from "../delete-actions";

export function useAvatars() {
  const [avatars, setAvatars] = useState<readonly TwinSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const result = await listTwins();
        setAvatars(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load avatars");
      } finally {
        setLoading(false);
      }
    };

    void fetch();
  }, []);

  return { avatars, loading, error };
}
