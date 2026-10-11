import { type AiFailureProvider } from "@/lib/dashboard/admin";

export function AiFailureList({ providers }: { readonly providers: AiFailureProvider[] }) {
  if (providers.length === 0) {
    return <p className="text-sm text-ink-soft">No AI failures in the last 24 hours.</p>;
  }

  return (
    <ul className="space-y-2">
      {providers.map((provider) => (
        <li
          key={`${provider.provider}-${provider.model}`}
          className="rounded-lg bg-destructive/5 px-3 py-2 text-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-ink">
              {provider.provider} / {provider.model}
            </span>
            <span className="text-destructive tabular-nums">
              {provider.failures}/{provider.calls} failed
            </span>
          </div>
          {provider.lastError && (
            <p className="mt-0.5 truncate text-destructive">{provider.lastError}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
