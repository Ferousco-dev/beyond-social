"use server";

import { Job } from "bullmq";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { QUEUE_AUDIT_ACTIONS, recordQueueAction, type QueueAuditAction } from "@/lib/queues/audit";
import { withPublishQueue } from "@/lib/queues/connection";
import { jobIdSchema } from "@/lib/queues/schemas";
import { type Json } from "@/lib/auth/database";

import { type QueueActionState } from "./action-state";

const QUEUE_PATH = "/queues";

type JobActionKind = "retry" | "remove";

interface JobActionSpec {
  readonly done: QueueAuditAction;
  readonly refused: QueueAuditAction;
  readonly verb: string;
  perform(job: Job): Promise<void>;
}

const SPECS: Record<JobActionKind, JobActionSpec> = {
  retry: {
    done: QUEUE_AUDIT_ACTIONS.retry,
    refused: QUEUE_AUDIT_ACTIONS.retryFailed,
    verb: "retried",
    // Scoped to 'failed' so a job that moved on between the read and the write
    // is refused rather than pulled back out of whatever state it reached.
    perform: (job) => job.retry("failed"),
  },
  remove: {
    done: QUEUE_AUDIT_ACTIONS.remove,
    refused: QUEUE_AUDIT_ACTIONS.removeFailed,
    verb: "removed",
    perform: async (job) => {
      await job.remove();
    },
  },
};

export async function retryFailedJob(
  _previous: QueueActionState,
  formData: FormData,
): Promise<QueueActionState> {
  return runJobAction("retry", formData);
}

export async function removeFailedJob(
  _previous: QueueActionState,
  formData: FormData,
): Promise<QueueActionState> {
  return runJobAction("remove", formData);
}

/**
 * Reads the job, records the intent, then acts.
 *
 * Two Redis round trips rather than one: the audit row needs the job's state
 * before the change, and writing that row must not happen inside the render
 * deadline that guards the queue connection. The order is deliberate. If the
 * audit write fails, nothing is touched. If the queue then refuses the change,
 * a second row records that too, so the log never claims an action that did not
 * take effect.
 */
async function runJobAction(kind: JobActionKind, formData: FormData): Promise<QueueActionState> {
  await requireAdmin();

  const spec = SPECS[kind];
  const parsedId = jobIdSchema.safeParse(formData.get("jobId"));
  if (!parsedId.success) return { status: "error", message: "That job id is not valid." };
  const jobId = parsedId.data;

  const before = await withPublishQueue(async (queue) => {
    const job = await Job.fromId(queue, jobId);
    if (!job) return null;
    return { attemptsMade: job.attemptsMade, failedReason: job.failedReason ?? "" } satisfies Json;
  });

  if (!before.ok) return { status: "error", message: unavailableMessage(before.reason) };
  if (before.value === null) {
    return { status: "error", message: `Job ${jobId} is no longer in the queue.` };
  }

  await recordQueueAction({
    action: spec.done,
    jobId,
    summary: `Failed publish job ${jobId} ${spec.verb} from the queue inspector`,
    before: before.value,
  });

  const result = await withPublishQueue(async (queue) => {
    const job = await Job.fromId(queue, jobId);
    if (!job) throw new Error("Job disappeared");
    await spec.perform(job);
  });

  if (!result.ok) {
    await recordQueueAction({
      action: spec.refused,
      jobId,
      summary: `Job ${jobId} could not be ${spec.verb}: the queue refused or was unreachable`,
      before: before.value,
    });
    return { status: "error", message: `Job ${jobId} could not be ${spec.verb}.` };
  }

  revalidatePath(QUEUE_PATH);
  return { status: "ok", message: `Job ${jobId} ${spec.verb}.` };
}

function unavailableMessage(reason: "not-configured" | "unreachable"): string {
  return reason === "not-configured"
    ? "No queue is configured, so there is nothing to change."
    : "The queue is not reachable, so nothing was changed.";
}
