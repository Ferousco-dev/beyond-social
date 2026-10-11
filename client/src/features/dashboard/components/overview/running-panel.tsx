import { CircleDashed } from "lucide-react";
import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

import { relativeTime } from "@/lib/time/zone";
import { cn } from "@/lib/utils";

import { Panel, PanelEmpty, PanelList, PanelMore, PanelRow } from "./panel";
import { type Capped, type RunningGeneration, type RunningStatus } from "./types";

const STATUS_LABEL: Readonly<Record<RunningStatus, string>> = {
  queued: "Queued",
  generating: "Rendering",
};

const ROW_LINK =
  "flex min-h-11 flex-col justify-center gap-0.5 px-4 py-2.5 transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";

/** Videos the provider is still working on, which is the first thing anyone asks. */
export function RunningPanel({ running }: { readonly running: Capped<RunningGeneration> }) {
  return (
    <Panel title="In progress" meta={running.total === 0 ? "None" : `${running.total} running`}>
      {running.items.length === 0 ? (
        <PanelEmpty icon={CircleDashed}>
          Nothing rendering. Videos appear here while a provider is working on them.
        </PanelEmpty>
      ) : (
        <>
          <PanelList>
            {running.items.map((item) => (
              <PanelRow key={item.id}>
                <Link href={`/dashboard/c/${item.projectId}` as Route} className={ROW_LINK}>
                  <span className="flex items-center gap-2">
                    <StatusDot status={item.status} />
                    <span className="truncate text-sm text-ink">{item.prompt}</span>
                  </span>
                  <span className="truncate pl-4 text-xs text-ink-soft">
                    {STATUS_LABEL[item.status]}
                    {item.projectTitle ? ` in ${item.projectTitle}` : ""}, started{" "}
                    {relativeTime(item.startedAt)}
                  </span>
                </Link>
              </PanelRow>
            ))}
          </PanelList>
          <PanelMore hidden={running.total - running.items.length} />
        </>
      )}
    </Panel>
  );
}

function StatusDot({ status }: { readonly status: RunningStatus }): ReactNode {
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        status === "generating" ? "animate-pulse bg-primary" : "bg-ink-soft",
      )}
    />
  );
}
