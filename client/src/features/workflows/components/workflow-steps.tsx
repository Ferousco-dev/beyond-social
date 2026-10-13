import { cn } from "@/lib/utils";

import type { GoWorkflowStep } from "@/lib/go-api/schemas";

const TOOL_LABELS: Readonly<Record<string, string>> = {
  discover_videos: "Discover",
  transform_video: "Transform",
  create_avatar_video: "Avatar video",
  generate_video: "Video clip",
  get_job_status: "Check job",
  get_workflow_status: "Check workflow",
};

const BILLABLE_TOOLS = new Set(["discover_videos", "transform_video", "create_avatar_video", "generate_video"]);

export function toolLabel(tool: string): string {
  return TOOL_LABELS[tool] ?? tool;
}

export function isBillableTool(tool: string): boolean {
  return BILLABLE_TOOLS.has(tool);
}

const DOT: Readonly<Record<GoWorkflowStep["status"], string>> = {
  pending: "bg-hairline",
  running: "bg-info",
  completed: "bg-success",
  failed: "bg-destructive",
  skipped: "bg-hairline opacity-50",
};

/** The plan as steps: tool, dependencies, and live state. No raw args shown. */
export function WorkflowSteps({ steps }: { steps: readonly GoWorkflowStep[] }) {
  return (
    <ol className="space-y-1.5">
      {steps.map((step, index) => (
        <li
          key={step.id}
          className="flex items-center gap-2.5 rounded-xl border border-hairline bg-cloud/50 px-3 py-2"
        >
          <span className={cn("size-2 shrink-0 rounded-full", DOT[step.status])} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm text-ink">
            <span className="font-medium">{toolLabel(step.tool)}</span>
            <span className="text-ink-soft"> · step {index + 1}</span>
          </span>
          {isBillableTool(step.tool) ? (
            <span className="shrink-0 rounded-full border border-hairline px-2 py-0.5 text-[11px] text-ink-soft">
              Uses credits
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/** Renders http(s) strings found in step outputs as links to results. */
export function StepResultLinks({ steps }: { steps: readonly GoWorkflowStep[] }) {
  const links = steps.flatMap((step) => resultLinks(step.output, toolLabel(step.tool)));
  if (links.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {links.map((link) => (
        <li key={link.url} className="space-y-1.5">
          {isVideoUrl(link.url) ? (
            <video src={link.url} controls playsInline preload="metadata" className="w-full max-w-sm rounded-xl bg-ink" />
          ) : null}
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="block truncate rounded-xl border border-hairline bg-cloud/50 px-3 py-2 text-sm font-medium text-primary hover:underline"
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

function resultLinks(output: Readonly<Record<string, unknown>>, label: string): { url: string; label: string }[] {
  const found: { url: string; label: string }[] = [];
  const visit = (value: unknown): void => {
    if (typeof value === "string" && value.startsWith("https://")) {
      found.push({ url: value, label: `${label} result` });
    } else if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (typeof value === "object" && value !== null) {
      Object.values(value).forEach(visit);
    }
  };
  visit(output);
  return found.slice(0, 4);
}

function isVideoUrl(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".mp4");
  } catch {
    return false;
  }
}
