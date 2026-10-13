import { type Metadata } from "next";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { ModelPicker } from "@/features/admin-console/components/model-picker";
import { modelsResponse } from "@/lib/go-api/admin-schemas";
import { goApi } from "@/lib/go-api/client";

export const metadata: Metadata = { title: "Admin · Models" };

export default async function AdminModelsPage(): Promise<ReactNode> {
  const result = await goApi("/api/v1/admin/models", modelsResponse);
  if (!result.ok) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {result.message}
      </p>
    );
  }
  const { roles, catalog, openrouter_configured } = result.data.data;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Models</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Pick which model answers each kind of request. Gemini is the default. Watching videos and listening to speech always use Gemini.
      </p>
      {!openrouter_configured ? (
        <p className="mt-4 rounded-lg border border-hairline bg-paper p-3 text-sm text-ink-soft">
          To use other models, paste an OpenRouter key on the{" "}
          <Link href={"/dashboard/admin/providers" as Route} className="text-ink underline">
            provider keys
          </Link>{" "}
          page first.
        </p>
      ) : null}
      <ul className="mt-6 divide-y divide-hairline rounded-xl border border-hairline bg-paper">
        {roles.map((role) => (
          <ModelPicker key={role.key} role={role} catalog={catalog} />
        ))}
      </ul>
    </div>
  );
}
