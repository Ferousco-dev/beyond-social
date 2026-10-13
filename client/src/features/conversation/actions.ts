"use server";

import { z } from "zod";

import { goApi, isGoApiConfigured } from "@/lib/go-api/client";
import {
  conversationResponse,
  exchangeResponse,
  threadResponse,
  type ChatMessage,
} from "@/lib/go-api/schemas";

export type StartResult =
  | { readonly status: "ok"; readonly conversationId: string }
  | { readonly status: "error"; readonly message: string };

export type SendResult =
  | { readonly status: "ok"; readonly user: ChatMessage; readonly assistant: ChatMessage }
  | { readonly status: "error"; readonly message: string; readonly code?: string };

/** A turn waits on a model; the API gives up at 75 seconds. */
const CHAT_TIMEOUT_MS = 80_000;

const UNAVAILABLE = "The assistant is not available right now.";

export async function startConversation(): Promise<StartResult> {
  if (!isGoApiConfigured()) return { status: "error", message: UNAVAILABLE };
  const result = await goApi("/api/v1/conversations", conversationResponse, { method: "POST" });
  return result.ok
    ? { status: "ok", conversationId: result.data.data.id }
    : { status: "error", message: result.message };
}

const sendSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().trim().max(2000),
  /** One per attempt, so a retry after a dropped connection is not answered twice. */
  idempotencyKey: z.string().min(8).max(128),
  attachments: z.array(z.string().uuid()).max(4).default([]),
  /** Where the person is, so "tomorrow at 6pm" means their tomorrow. */
  timeZone: z.string().max(64).default(""),
});

export async function sendChatMessage(input: z.input<typeof sendSchema>): Promise<SendResult> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Messages are up to 2000 characters, with up to 4 files." };
  if (!isGoApiConfigured()) return { status: "error", message: UNAVAILABLE };

  const { conversationId, content, idempotencyKey, attachments, timeZone } = parsed.data;
  if (content === "" && attachments.length === 0) return { status: "error", message: "Write a message or attach a file." };
  const result = await goApi(`/api/v1/conversations/${conversationId}/messages`, exchangeResponse, {
    method: "POST",
    body: { content, attachments, time_zone: timeZone },
    headers: { "Idempotency-Key": idempotencyKey },
    timeoutMs: CHAT_TIMEOUT_MS,
  });
  return result.ok
    ? { status: "ok", user: result.data.data.user, assistant: result.data.data.assistant }
    : { status: "error", message: result.message, code: result.code };
}

export type ThreadResult =
  | { readonly status: "ok"; readonly messages: readonly ChatMessage[] }
  | { readonly status: "error" };

/** The saved messages, for catching up after the live connection was down. */
export async function loadThread(conversationId: string): Promise<ThreadResult> {
  if (!z.string().uuid().safeParse(conversationId).success || !isGoApiConfigured()) return { status: "error" };
  const result = await goApi(`/api/v1/conversations/${conversationId}`, threadResponse);
  return result.ok ? { status: "ok", messages: result.data.data.messages } : { status: "error" };
}
