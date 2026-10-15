import { type Metadata } from "next";
import { type ReactNode } from "react";

import { GenerationWizard } from "@/features/new-video/components/generation-wizard";
import { listTwins } from "@/features/live-avatar/delete-actions";
import { getCurrentUser } from "@/lib/dashboard/current-user";

export const metadata: Metadata = { title: "New video" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  objective?: string;
  audience?: string;
  offering?: string;
  country?: string;
  style?: string;
  hook?: string;
  sceneVisual?: string;
  source?: string;
}>;

function bounded(value: string | undefined, limit: number): string | undefined {
  return value?.slice(0, limit);
}

export default async function NewVideoPage({
  searchParams,
}: {
  readonly searchParams: SearchParams;
}): Promise<ReactNode> {
  const params = await searchParams;
  const [user, avatars] = await Promise.all([getCurrentUser(), listTwins()]);

  return (
    <GenerationWizard
      draftScope={user.email}
      credits={user.credits}
      avatars={avatars.filter((avatar) => avatar.trainingStatus === "ready")}
      initialBrief={{
        source: params.source === "idea" || params.source === "reference" ? params.source : undefined,
        objective: bounded(params.objective, 120),
        audience: bounded(params.audience, 300),
        offering: bounded(params.offering, 300),
        country: bounded(params.country, 100),
        style: bounded(params.style, 200),
        hook: bounded(params.hook, 250),
        sceneVisual: bounded(params.sceneVisual, 500),
      }}
    />
  );
}
