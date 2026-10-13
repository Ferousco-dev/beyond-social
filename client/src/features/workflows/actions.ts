"use server";

import { z } from "zod";

import { goApi, isGoApiConfigured } from "@/lib/go-api/client";
import { workflowResponse } from "@/lib/go-api/schemas";

import type { GoWorkflow } from "@/lib/go-api/schemas";

export type WorkflowResult =
  | { readonly status: "ok"; readonly workflow: GoWorkflow }
  | { readonly status: "unconfigured" }
  | { readonly status: "error"; readonly message: string };

/**
 * AI workflows on the Go API: plan from a sentence, approve the exact plan,
 * then follow it to completion. Ownership is enforced server-side; the plan
 * hash binds approval to the previewed plan.
 */
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
