import { Trash2 } from "lucide-react";
import { type Metadata } from "next";
import { type ReactNode } from "react";

import { Unavailable } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { DeletedTable } from "@/features/deleted/components/deleted-table";
import { ErasureNotice } from "@/features/deleted/components/erasure-notice";
import { fetchDeletedAccounts } from "@/features/deleted/read";

export const metadata: Metadata = { title: "Deleted accounts" };

/** A grace period counts down by the hour, and a cached count of days is one that lies. */
export const dynamic = "force-dynamic";

/**
 * The deletion queue.
 *
 * Deleting an account sets a flag; it wipes nothing. So this page is where a
 * deletion is visible at all, where it can be undone, and where an account that
 * has outlasted its 30 days is surfaced for a decision. The read runs through
 * `admin_deleted_accounts`, which checks `is_admin()` in the database before it
 * returns a row.
 */
export default async function DeletedPage(): Promise<ReactNode> {
  const accounts = await fetchDeletedAccounts();

  return (
    <>
      <PageHeader
        title="Deleted accounts"
        description="Deleting an account disables it and starts a 30 day clock. Nothing it made is removed, and an admin can put it back until that clock runs out. Account facts only, never content."
      />

      {!accounts ? (
        <Unavailable what="The list of deleted accounts" />
      ) : accounts.eligible.length + accounts.inGrace.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="No deleted accounts"
          description="An account appears here as soon as it is deleted, whether the account holder asked for it or an admin did, and stays until it is restored or erased."
        />
      ) : (
        <>
          {accounts.eligible.length > 0 ? (
            <Section
              title="Past the grace period"
              description="These accounts are older than 30 days deleted and are eligible for permanent erasure. They can still be restored."
            >
              <div className="space-y-4">
                <ErasureNotice count={accounts.eligible.length} />
                <DeletedTable
                  accounts={accounts.eligible}
                  caption="Deleted accounts past their grace period, oldest first"
                />
              </div>
            </Section>
          ) : null}

          {accounts.inGrace.length > 0 ? (
            <Section
              title="Within the grace period"
              description="Still inside the 30 days. Restoring one of these returns the account and its work exactly as they were."
            >
              <DeletedTable
                accounts={accounts.inGrace}
                caption="Deleted accounts still within their grace period, oldest first"
              />
            </Section>
          ) : null}
        </>
      )}
    </>
  );
}
