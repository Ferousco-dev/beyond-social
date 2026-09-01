import { GraduationCap } from "lucide-react";
import { type Metadata } from "next";
import { type ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { requireAdmin } from "@/lib/auth/require-admin";

import { CandidateCard } from "@/features/learning/components/candidate-card";
import { fetchPendingCandidates } from "@/features/learning/rpc";

export const metadata: Metadata = { title: "Learning review" };
export const dynamic = "force-dynamic";

/**
 * The knowledge the product has learned and is waiting to be told what to do
 * with.
 *
 * The pipeline evaluates every prompt worth learning from, gates what it cannot
 * promote on its own, and files it as pending. Auto-promotion is off by
 * default, which is the right default and made this the whole of the learning
 * loop in practice: a queue with no reader, filling up, deciding nothing.
 */
export default async function LearningPage(): Promise<ReactNode> {
  await requireAdmin();
  const candidates = await fetchPendingCandidates();

  return (
    <>
      <PageHeader
        title="Learning review"
        description="Knowledge extracted from real prompts, held until somebody accepts it. Promoting adds it to the base every future generation retrieves from."
      />

      <Section
        title="Awaiting review"
        description="Newest first. Promoting a merge candidate re-checks it against the current chunk before it lands."
      >
        {candidates === null ? (
          <EmptyState
            icon={GraduationCap}
            title="The queue could not be read"
            description="The learning store did not answer. This is not the same as an empty queue, so nothing is being shown rather than showing nothing and implying there is nothing."
          />
        ) : candidates.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Nothing waiting"
            description="Every candidate has been decided. New ones appear as people use the product, and only when the pipeline judges a prompt worth learning from, which is deliberately uncommon."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {candidates.map((candidate) => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
