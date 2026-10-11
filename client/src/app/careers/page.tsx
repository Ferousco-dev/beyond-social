import { type Metadata } from "next";
import { type ReactNode } from "react";

import { PageShell, Prose } from "@/components/landing/page-shell";

export const metadata: Metadata = { title: "Work with us" };

export default function Page(): ReactNode {
  return (
    <PageShell
      eyebrow="Company"
      title="Work with us"
      lede="There are no open roles right now. Here is what the work actually is, in case you want to know when that changes."
    >
      <Prose>
        <p>
          We are not running a hiring process yet. When a role opens it will be listed on this page,
          with the scope and the expectations written out before anyone is asked to interview. Until
          then this page has no vacancies on it, and we would rather say so plainly than keep a
          general application form open to look larger than we are.
        </p>
        <p>
          The work is building an AI product where the output is the entire proposition. Most of the
          engineering is not the model. It is the retrieval layer that decides which craft knowledge
          a given shot needs, the evaluation problem of telling a good generation from a mediocre
          one without watching every frame by hand, the cost and queueing of long-running jobs, and
          an interface that has to make a slow, probabilistic process feel steady.
        </p>
        <p>
          What is hard about it is that the quality bar is partly a matter of taste and the feedback
          loop is slow. A change to how a prompt is assembled can improve one kind of shot and
          quietly spoil another, and you will not know until you watch the results. A lot of the job
          is watching the results. If you want a test suite to tell you whether the work is good,
          this problem will frustrate you.
        </p>
        <p>
          The people who would enjoy it tend to have one foot outside software. They have edited
          something, or lit something, or can say why a cut lands, and they also want to write the
          code themselves rather than hand a spec to someone else. The team is small, so the work is
          broad and nobody owns only one layer of it.
        </p>
        <p>
          If that sounds like you, email hello@beyondsocial.app and tell us what you have made. Send
          the thing itself rather than a description of it. There may be no role to talk about for a
          while, and we will say so if there is not.
        </p>
      </Prose>
    </PageShell>
  );
}
