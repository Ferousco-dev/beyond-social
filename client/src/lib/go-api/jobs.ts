import { type GoJob } from "./schemas";

/** A background job (video transformation or avatar video) as the UI shows it. */
export interface JobView {
  readonly id: string;
  readonly status: GoJob["status"];
  readonly stage: string | null;
  /** 0 to 100, as the backend reported it. */
  readonly progress: number;
  /** A sentence safe to show, set only when the job failed. */
  readonly error: string | null;
  /** The finished video. Null until the provider has confirmed the result. */
  readonly resultUrl: string | null;
}

export const isFinished = (job: JobView): boolean =>
  job.status === "completed" || job.status === "failed" || job.status === "ready";

/** Only an https URL is ever handed to a <video> element. */
function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

export function toJobView(job: GoJob): JobView {
  return {
    id: job.id,
    status: job.status,
    stage: job.stage ?? null,
    progress: job.progress,
    error: job.error ?? null,
    resultUrl: job.status === "completed" ? httpsUrl(job.result?.["video_url"]) : null,
  };
}

