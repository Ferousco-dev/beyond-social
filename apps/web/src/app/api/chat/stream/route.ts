import { type NextRequest } from "next/server";

import { runWithAiUser } from "@/lib/ai/request-user";
import { runTurn, sendSchema, type SendResult, type TurnStage } from "@/lib/chat/turn";
import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { withActionTrace } from "@/lib/observability/trace";
import { createClient } from "@/lib/supabase/server";

/**
 * The same turn as the server action, delivered as it happens.
 *
 * A server action can only hand back one value when everything is finished,
 * which for a turn that classifies, grounds, enhances, starts a render and
 * writes a reply is several seconds of a spinner. This is the identical
 * pipeline with the events wired to the wire, so the interface can say which
 * step is actually running and show the reply as it is written.
 *
 * The action is still there and still correct. Anything that cannot use a
 * stream, or that runs where one is awkward, keeps working unchanged.
 */

/** Long enough for a slow chain, short enough that a hung turn is not forever. */
export const maxDuration = 60;

interface Event {
  readonly type: "stage" | "chunk" | "result" | "error";
  readonly stage?: TurnStage;
  readonly text?: string;
  readonly result?: SendResult;
  readonly message?: string;
}

function encode(event: Event): string {
  // One JSON object per event, single line. Newlines inside the payload are
  // escaped by JSON.stringify, which is what keeps a reply containing a line
  // break from terminating the SSE frame early.
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest): Promise<Response> {
  if (!isSupabaseConfigured) {
    return Response.json({ status: "unconfigured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // The route decides who the caller is, exactly as the action does. `runTurn`
  // trusts the id it is given, so this is the only place that may establish it.
  if (!user) return Response.json({ status: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ status: "error", message: "Invalid request" }, { status: 400 });
  }

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const metadataName = user.user_metadata?.full_name;
  const name = typeof metadataName === "string" ? metadataName : "";

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      /*
       * Enqueueing onto a closed stream throws, and the stream closes as soon
       * as the reader goes away, which is what cancelling a turn does. The turn
       * itself keeps running to completion so the render that was already
       * started still lands and the message is still saved: abandoning it here
       * would leave a charged generation with no turn in the thread.
       */
      let open = true;
      const send = (event: Event): void => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(encode(event)));
        } catch {
          open = false;
        }
      };

      try {
        const result = await withActionTrace("sendMessageStream", () =>
          runWithAiUser(user.id, () =>
            runTurn(parsed.data, user.id, supabase, name, {
              onStage: (stage) => send({ type: "stage", stage }),
              onReplyChunk: (text) => send({ type: "chunk", text }),
            }),
          ),
        );

        send({ type: "result", result });
      } catch (error) {
        logger.error("streamed turn failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        send({ type: "error", message: "That could not be sent. Try again." });
      } finally {
        if (open) controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // Nginx and several proxies buffer a response body by default, which
      // holds every event until the turn ends and makes streaming pointless.
      "x-accel-buffering": "no",
    },
  });
}
