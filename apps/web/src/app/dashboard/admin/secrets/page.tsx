import { type Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getManagedSecrets } from "@/lib/dashboard/admin";
import { AddSecretForm } from "@/features/admin/components/add-secret-form";
import { SecretRow } from "@/features/admin/components/secret-row";

export const metadata: Metadata = { title: "Admin · Secrets" };

function SecretsSkeleton() {
  return (
    <ul className="mt-6 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-2 h-3 w-1/4" />
        </li>
      ))}
    </ul>
  );
}

async function SecretsSection() {
  const secrets = await getManagedSecrets();
  return (
    <ul className="mt-6 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
      {secrets.map((secret) => (
        <SecretRow key={secret.key} secret={secret} />
      ))}
      <li>
        <AddSecretForm />
      </li>
    </ul>
  );
}

export default function AdminSecretsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Secrets</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Metadata only. No value is ever readable here; the registry says whether one is set and when
        it last rotated.
      </p>

      <Suspense fallback={<SecretsSkeleton />}>
        <SecretsSection />
      </Suspense>
    </div>
  );
}
