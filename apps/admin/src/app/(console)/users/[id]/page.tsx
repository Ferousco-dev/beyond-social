import Link from "next/link";
import { notFound } from "next/navigation";
import { type Metadata } from "next";
import { type ReactNode } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { AccountSummary } from "@/features/users/components/account-summary";
import { CreditsForm } from "@/features/users/components/credits-form";
import { PlanForm } from "@/features/users/components/plan-form";
import { SuspensionForm } from "@/features/users/components/suspension-form";
import { readUserDetail } from "@/features/users/rpc";

export const metadata: Metadata = { title: "Account" };

/** Every figure here is either about to be changed or about to be acted on. */
export const dynamic = "force-dynamic";

/**
 * One account: what it is on, how much it has used, and the three things an
 * operator can change about it.
 *
 * The id comes from the URL, so it is validated as a uuid before it reaches the
 * database rather than after. A miss is a 404: the console does not distinguish
 * a deleted account from one that never existed.
 */
export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<ReactNode> {
  const { id } = await params;
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) notFound();

  const user = await readUserDetail(parsed.data);
  if (!user) notFound();

  return (
    <>
      <PageHeader
        title={user.email}
        description="Usage and standing for one account. This console never shows another person's projects, prompts, messages or memories."
        actions={
          <Link
            href="/users"
            className="inline-flex h-9 items-center rounded-lg border border-hairline px-3 text-sm text-ink transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            All accounts
          </Link>
        }
      />

      <Section title="Account" description="Counts and dates only.">
        <AccountSummary user={user} />
      </Section>

      <Section
        title="Credits"
        description="The allowance and how much of it is spent. A change to the allowance is written to the customer's credit ledger too, so it shows on their own usage page."
      >
        <CreditsForm user={user} />
      </Section>

      <Section
        title="Plan"
        description="An override for comping and repair. Stripe still owns the subscription and its next webhook will reassert what was actually bought."
      >
        <PlanForm user={user} />
      </Section>

      <Section
        title="Standing"
        description="Suspension is enforced by the database, not by this page."
      >
        <SuspensionForm user={user} />
      </Section>
    </>
  );
}
