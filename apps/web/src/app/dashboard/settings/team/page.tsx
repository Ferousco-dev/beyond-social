import { Users } from "lucide-react";
import { type Metadata } from "next";

import { CreateTeamForm } from "@/features/organizations/components/create-team-form";
import { getOrganizations } from "@/lib/dashboard/organizations";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const organizations = await getOrganizations();

  return (
    <section className="mt-6 lg:mt-8">
      <p className="text-sm text-ink-soft">
        Share projects with people you work with. Personal projects stay private.
      </p>

      <div className="mt-6 rounded-2xl border border-hairline bg-paper p-5">
        <CreateTeamForm />
      </div>

      {organizations.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {organizations.map((org) => (
            <li
              key={org.id}
              className="flex items-center justify-between rounded-xl border border-hairline bg-paper p-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-cloud text-ink-soft">
                  <Users className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{org.name}</p>
                  <p className="text-xs text-ink-soft">{org.slug}</p>
                </div>
              </div>
              <span className="rounded-full border border-hairline px-2.5 py-1 text-[11px] capitalize text-ink-soft">
                {org.role}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-hairline bg-paper p-10 text-center">
          <p className="text-sm font-medium text-ink">No teams yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
            Create one to share projects. You will be its owner, and you can add people afterwards.
          </p>
        </div>
      )}
    </section>
  );
}
