import { type Metadata } from "next";

import { getManagedSecrets } from "@/lib/dashboard/admin";
import { SecretRow } from "@/features/admin/components/secret-row";

export const metadata: Metadata = { title: "Admin · Secrets" };

export default async function AdminSecretsPage() {
  const secrets = await getManagedSecrets();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Secrets</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Metadata only. No value is ever readable here; the registry says whether one is set and when
        it last rotated.
      </p>

      <ul className="mt-6 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
        {secrets.map((secret) => (
          <SecretRow key={secret.key} secret={secret} />
        ))}
      </ul>
    </div>
  );
}
