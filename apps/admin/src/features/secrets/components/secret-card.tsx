import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

import { formatRotatedAt, formatRotatedBy, formatTail } from "../format";
import { LOCATION_NOTES, type ManagedSecret } from "../types";
import { ClearForm } from "./clear-form";
import { RotateForm } from "./rotate-form";

/**
 * One secret, as metadata and a rotation form.
 *
 * Everything shown here comes from `managed_secrets`. There is nothing on this
 * card derived from the console's own environment, because the console's
 * environment is not the environment the secret is read in.
 */
export function SecretCard({ secret }: { secret: ManagedSecret }): ReactNode {
  return (
    <article className="space-y-4 rounded-xl border border-hairline bg-paper p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="font-mono text-sm text-ink">{secret.key}</h3>
          <p className="max-w-2xl text-sm text-ink-soft">{secret.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {secret.hasStoredValue ? <Badge tone="info">Copy in vault</Badge> : null}
          <Badge tone={secret.isSet ? "success" : "warning"}>
            {secret.isSet ? "Set" : "Not set"}
          </Badge>
        </div>
      </header>

      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <Detail label="Value ends in">
          <span className="font-mono text-ink">{formatTail(secret)}</span>
        </Detail>
        <Detail label="Read by">{secret.expectedBy}</Detail>
        <Detail label="Last rotated">
          {formatRotatedAt(secret.rotatedAt)}, by {formatRotatedBy(secret.rotatedByEmail)}
        </Detail>
        <Detail label="Configured in">{LOCATION_NOTES[secret.location].label}</Detail>
      </dl>

      <RotateForm secret={secret} />

      {secret.isSet ? <ClearForm secret={secret} /> : null}
    </article>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }): ReactNode {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  );
}
