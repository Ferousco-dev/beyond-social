import { type ReactNode } from "react";

import { type ChatMessage } from "@/lib/go-api/schemas";
import { cn } from "@/lib/utils";

import { WorkflowCard } from "./workflow-card";

export function MessageBubble({ message }: { readonly message: ChatMessage }): ReactNode {
  const mine = message.role === "user";

  return (
    <li className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] sm:max-w-[75%]", !mine && message.workflow_id && "w-full sm:w-[75%]")}>
        <p
          className={cn(
            "whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            mine ? "bg-ink text-paper" : "border border-hairline bg-paper text-ink",
          )}
        >
          {message.content}
        </p>
        {message.workflow_id ? <WorkflowCard workflowId={message.workflow_id} /> : null}
      </div>
    </li>
  );
}
