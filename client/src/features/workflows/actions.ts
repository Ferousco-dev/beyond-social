"use server";

import { z } from "zod";

import { goApi, isGoApiConfigured } from "@/lib/go-api/client";
import { workflowListResponse, workflowResponse, workflowStepsResponse } from "@/lib/go-api/schemas";

import type { GoWorkflow, GoWorkflowStep } from "@/lib/go-api/schemas";

export type WorkflowResult =
  | { readonly status: "ok"; readonly workflow: GoWorkflow }
  | { readonly status: "unconfigured" }
  | { readonly status: "error"; readonly message: string };

export type WorkflowStepsResult =
  | { readonly status: "ok"; readonly steps: readonly GoWorkflowStep[] }
  | { readonly status: "unconfigured" }
  | { readonly status: "error"; readonly message: string };

const submitSchema = z.object({
  objective: z.string().trim().min(1).max(2000),
  idempotencyKey: z.string().min(8).max(128),
});

/**
 * AI workflows on the Go API: plan from a sentence, approve the exact plan,
 * then follow it to completion. Ownership is enforced server-side; the plan
 * hash binds approval to the previewed plan.
 */
export async function submitWorkflow(input: z.input<typeof submitSchema>): Promise<WorkflowResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Describe the workflow first." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };

  const result = await goApi("/api/v1/workflows", workflowResponse, {
    method: "POST",
    body: { objective: parsed.data.objective },
    headers: { "Idempotency-Key": parsed.data.idempotencyKey },
  });
  return result.ok ? { status: "ok", workflow: result.data.data } : { status: "error", message: result.message };
}

export async function approveWorkflow(workflowId: string, planHash: string): Promise<WorkflowResult> {
  if (!z.string().uuid().safeParse(workflowId).success || !/^[0-9a-f]{64}$/.test(planHash)) {
    return { status: "error", message: "Unknown workflow." };
  }
  if (!isGoApiConfigured()) return { status: "unconfigured" };

  const result = await goApi(`/api/v1/workflows/${workflowId}/approve`, workflowResponse, {
    method: "POST",
    body: { plan_hash: planHash },
  });
  return result.ok ? { status: "ok", workflow: result.data.data } : { status: "error", message: result.message };
}

export async function startWorkflow(workflowId: string): Promise<WorkflowResult> {
  if (!z.string().uuid().safeParse(workflowId).success) return { status: "error", message: "Unknown workflow." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };

  const result = await goApi(`/api/v1/workflows/${workflowId}/start`, workflowResponse, { method: "POST" });
  return result.ok ? { status: "ok", workflow: result.data.data } : { status: "error", message: result.message };
}

export async function cancelWorkflow(workflowId: string): Promise<WorkflowResult> {
  if (!z.string().uuid().safeParse(workflowId).success) return { status: "error", message: "Unknown workflow." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };

  const result = await goApi(`/api/v1/workflows/${workflowId}/cancel`, workflowResponse, { method: "POST" });
  return result.ok ? { status: "ok", workflow: result.data.data } : { status: "error", message: result.message };
}

export async function getWorkflow(workflowId: string): Promise<WorkflowResult> {
  if (!z.string().uuid().safeParse(workflowId).success) return { status: "error", message: "Unknown workflow." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };

  const result = await goApi(`/api/v1/workflows/${workflowId}`, workflowResponse);
  return result.ok ? { status: "ok", workflow: result.data.data } : { status: "error", message: result.message };
}

export async function getWorkflowSteps(workflowId: string): Promise<WorkflowStepsResult> {
  if (!z.string().uuid().safeParse(workflowId).success) return { status: "error", message: "Unknown workflow." };
  if (!isGoApiConfigured()) return { status: "unconfigured" };

  const result = await goApi(`/api/v1/workflows/${workflowId}/history`, workflowStepsResponse);
  return result.ok ? { status: "ok", steps: result.data.data } : { status: "error", message: result.message };
}

export async function listWorkflows(): Promise<
  | { readonly status: "ok"; readonly workflows: readonly GoWorkflow[] }
  | { readonly status: "unconfigured" }
  | { readonly status: "error"; readonly message: string }
> {
  if (!isGoApiConfigured()) return { status: "unconfigured" };
  const result = await goApi("/api/v1/workflows?limit=10", workflowListResponse);
  return result.ok
    ? { status: "ok", workflows: result.data.data }
    : { status: "error", message: result.message };
}
