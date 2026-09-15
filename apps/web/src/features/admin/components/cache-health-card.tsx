import { type CacheHealth } from "@/lib/dashboard/admin";

export function CacheHealthCard({ cache }: { readonly cache: CacheHealth | null }) {
  if (!cache) {
    return (
      <section className="rounded-xl border border-hairline bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink">Cache health</h2>
        <p className="mt-2 text-sm text-ink-soft">Unavailable.</p>
      </section>
    );
  }

  const hitRate = cache.aiCalls > 0 ? (cache.cachedCalls / cache.aiCalls) * 100 : 0;

  return (
    <section className="rounded-xl border border-hairline bg-paper p-5">
      <h2 className="text-sm font-semibold text-ink">Cache health</h2>
      <p className="mt-1 text-[11px] text-ink-soft">
        as of {new Date(cache.observedAt).toLocaleTimeString()}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-xs text-ink-soft">Hit rate (24h)</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{hitRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-ink-soft">Live entries</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{cache.liveEntries}</p>
        </div>
        <div>
          <p className="text-xs text-ink-soft">Expired, unswept</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{cache.expiredEntries}</p>
        </div>
        <div>
          <p className="text-xs text-ink-soft">Embeddings cached</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{cache.embeddingEntries}</p>
        </div>
      </div>
    </section>
  );
}
