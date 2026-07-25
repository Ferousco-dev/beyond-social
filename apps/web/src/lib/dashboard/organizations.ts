import "server-only";

import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/** Roles, ordered from least to most privileged. */
export const ORG_ROLES = ["member", "admin", "owner"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: OrgRole;
}

const membershipSchema = z.object({
  role: z.enum(ORG_ROLES),
  organizations: z.object({ id: z.string(), name: z.string(), slug: z.string() }),
});

/**
 * Organizations the signed-in user belongs to. RLS already restricts this to
 * their own memberships, so there is no user filter here; the policy is the
 * filter, which keeps the rule in one place.
 */
export async function getOrganizations(): Promise<Organization[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("role, organizations(id, name, slug)");
  if (error || !data) return [];

  return data.flatMap((row) => {
    const parsed = membershipSchema.safeParse(row);
    if (!parsed.success) return [];
    return [{ ...parsed.data.organizations, role: parsed.data.role }];
  });
}

/** True when the role clears the bar, used for UI gating. */
export function hasRole(role: OrgRole, minimum: OrgRole): boolean {
  return ORG_ROLES.indexOf(role) >= ORG_ROLES.indexOf(minimum);
}
