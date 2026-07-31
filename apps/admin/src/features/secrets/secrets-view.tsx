import { KeyRound } from "lucide-react";
import { type ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";

import { SecretCard } from "./components/secret-card";
import { fetchSecrets } from "./read";
import { LOCATION_NOTES, SECRET_LOCATIONS, type ManagedSecret } from "./types";

/**
 * The registry, grouped by where the value is configured.
 *
 * Grouping is by location rather than by service because the action an operator
 * takes is the same for everything in a group, and it is the part they get
 * wrong: a key changed in Vercel does nothing until the next deploy. The group
 * heading says so once instead of every card repeating it.
 */
export async function SecretsView(): Promise<ReactNode> {
  const secrets = await fetchSecrets();

  if (!secrets) {
    return (
      <EmptyState
        icon={KeyRound}
        title="The registry could not be read"
        description="The admin_secrets_list function did not return. Nothing is shown rather than a list that might claim a credential is in place when it is not."
      />
    );
  }

  if (secrets.length === 0) {
    return (
      <EmptyState
        icon={KeyRound}
        title="No secrets registered"
        description="A secret appears here once it exists in managed_secrets, which is where the platform records what it needs."
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {SECRET_LOCATIONS.map((location) => {
        const group = secrets.filter((secret) => secret.location === location);
        if (group.length === 0) return null;

        return (
          <Section
            key={location}
            title={LOCATION_NOTES[location].label}
            description={`${describeGroup(group)} ${LOCATION_NOTES[location].effect}`}
          >
            <div className="flex flex-col gap-3">
              {group.map((secret) => (
                <SecretCard key={secret.key} secret={secret} />
              ))}
            </div>
          </Section>
        );
      })}
    </div>
  );
}

/** States the count of what is missing first, since that is what needs acting on. */
function describeGroup(group: readonly ManagedSecret[]): string {
  const missing = group.filter((secret) => !secret.isSet).length;
  const total = `${group.length} ${group.length === 1 ? "secret" : "secrets"}`;
  return missing === 0
    ? `${total}, all recorded as set.`
    : `${total}, ${missing} not recorded as set.`;
}
