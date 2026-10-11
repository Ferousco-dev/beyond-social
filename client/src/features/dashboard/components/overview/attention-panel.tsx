import { CircleCheck } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { relativeTime } from "@/lib/time/zone";

import { Panel, PanelEmpty, PanelList, PanelMore, PanelRow } from "./panel";
import { WINDOW_LABEL, type AttentionItem, type Capped } from "./types";

const ROW =
  "flex min-h-11 flex-col justify-center gap-0.5 px-4 py-2.5 transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";

const SOURCE_LABEL: Readonly<Record<AttentionItem["source"], string>> = {
  generation: "Generation failed",
  post: "Publish failed",
};

/** What broke and still needs a person. Nothing else earns a place this high. */
export function AttentionPanel({ attention }: { readonly attention: Capped<AttentionItem> }) {
  return (
    <Panel
      title="Needs attention"
      meta={attention.total === 0 ? WINDOW_LABEL : `${attention.total} failed`}
    >
      {attention.items.length === 0 ? (
        <PanelEmpty icon={CircleCheck}>Nothing failed in the last 30 days.</PanelEmpty>
      ) : (
        <>
          <PanelList>
            {attention.items.map((item) => (
              <PanelRow key={`${item.source}-${item.id}`}>
                {/*
                  A failure with a project behind it links to that conversation,
                  which is where it can be retried. One without is now plain
                  text: it used to point at the activity log, and that page is
                  gone, so a link would have been a link to nowhere.
                */}
                {item.projectId ? (
                  <Link href={`/dashboard/c/${item.projectId}` as Route} className={ROW}>
                    <FailureLine item={item} />
                  </Link>
                ) : (
                  <span className={ROW}>
                    <FailureLine item={item} />
                  </span>
                )}
              </PanelRow>
            ))}
          </PanelList>
          <PanelMore hidden={attention.total - attention.items.length} />
        </>
      )}
    </Panel>
  );
}

/** The row's contents, shared by the linked and unlinked forms. */
function FailureLine({ item }: { readonly item: AttentionItem }) {
  return (
    <>
      <span className="flex items-baseline gap-2">
        <span className="shrink-0 text-xs font-medium text-destructive">
          {SOURCE_LABEL[item.source]}
        </span>
        <span className="truncate text-sm text-ink">{item.title}</span>
      </span>
      <Reason reason={item.reason} at={item.at} />
    </>
  );
}

/** The provider's own message, or an honest admission that none was recorded. */
function Reason({
  reason,
  at,
}: {
  readonly reason: string | null;
  readonly at: string;
}): ReactNode {
  return (
    <span className="truncate text-xs text-ink-soft">
      {reason ?? "No error message recorded"}, {relativeTime(at)}
    </span>
  );
}
