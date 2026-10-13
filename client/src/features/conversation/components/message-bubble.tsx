import { type ReactNode } from "react";

import { Spinner } from "@/components/ui/spinner";
import { type ChatMessage } from "@/lib/go-api/schemas";
import { cn } from "@/lib/utils";

import { MessageAttachments } from "./message-attachments";
import { WorkflowCard } from "./workflow-card";

export function MessageBubble({
  message,
  watching = false,
  onReply,
  onChange,
  latestScript = false,
}: {
  readonly message: ChatMessage;
  /** True while the job this message started is still running. */
  readonly watching?: boolean;
  /** Sends a canned reply, used by the script choices. */
  readonly onReply?: (text: string) => void;
  /** Asks the message box to take focus so the user can type a change. */
  readonly onChange?: () => void;
  /** True only for the newest script in the thread. */
  readonly latestScript?: boolean;
}): ReactNode {
  const mine = message.role === "user";

  return (
    <li className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] sm:max-w-[75%]", !mine && message.workflow_id && "w-full sm:w-[75%]")}>
        {message.attachments && message.attachments.length > 0 ? <MessageAttachments items={message.attachments} /> : null}
        <p
          className={cn(
            "whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            mine ? "bg-ink text-paper" : "border border-hairline bg-paper text-ink",
          )}
        >
          {message.content}
        </p>
        {message.script && latestScript && onReply ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <Choice primary onClick={() => onReply("Use this script.")}>
              Use this script
            </Choice>
            <Choice onClick={() => onChange?.()}>Change it</Choice>
            <Choice onClick={() => onReply("Skip the script and make the video straight from my original idea.")}>
              Skip the script
            </Choice>
          </div>
        ) : null}
        {watching ? (
          <p className="mt-2 flex items-center gap-2 text-xs text-ink-soft" aria-live="polite">
            <Spinner className="size-3.5" />
            Watching the video
          </p>
        ) : null}
        {message.workflow_id ? <WorkflowCard workflowId={message.workflow_id} /> : null}
      </div>
    </li>
  );
}

function Choice({
  children,
  onClick,
  primary = false,
}: {
  readonly children: ReactNode;
  readonly onClick: () => void;
  readonly primary?: boolean;
}): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        primary ? "bg-primary text-primary-foreground hover:opacity-90" : "border border-hairline text-ink hover:bg-cloud",
      )}
    >
      {children}
    </button>
  );
}
