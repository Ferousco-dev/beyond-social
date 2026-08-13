import { type AiGateway } from "./gateway";
import { type Task } from "./models";

/**
 * Presents the gateway as the simple `Llm` shape the prompt engine already
 * depends on (`{ model, complete(params): Promise<string> }`). Structural typing
 * means the engine needs no change to gain routing, retries, fallback, and cost
 * accounting: it keeps calling `complete` and the gateway does the rest.
 *
 * `stream` is the same request delivered as it is written, for the one caller
 * that has somebody waiting on the other end: the chat reply. Everything else
 * here is a step in a pipeline whose output nobody reads until it is finished,
 * and streaming those would be motion with no audience.
 */
export class GatewayLlm {
  constructor(
    private readonly gateway: AiGateway,
    private readonly task: Task,
    private readonly userId?: string,
  ) {}

  /** The engine records this on generations; the task is the stable identity
   * here because the concrete model can change per call via fallback. */
  get model(): string {
    return `gateway:${this.task}`;
  }

  async complete(params: {
    system: string;
    messages: readonly { role: "system" | "user" | "assistant"; content: string }[];
    temperature?: number;
    maxTokens?: number;
    json?: boolean;
  }): Promise<string> {
    const response = await this.gateway.complete({
      task: this.task,
      system: params.system,
      messages: params.messages,
      ...(params.temperature === undefined ? {} : { temperature: params.temperature }),
      ...(params.maxTokens === undefined ? {} : { maxTokens: params.maxTokens }),
      ...(params.json === undefined ? {} : { json: params.json }),
      ...(this.userId === undefined ? {} : { userId: this.userId }),
    });
    return response.text;
  }

  async *stream(params: {
    system: string;
    messages: readonly { role: "system" | "user" | "assistant"; content: string }[];
    temperature?: number;
    maxTokens?: number;
    json?: boolean;
  }): AsyncIterable<string> {
    const events = this.gateway.stream({
      task: this.task,
      system: params.system,
      messages: params.messages,
      ...(params.temperature === undefined ? {} : { temperature: params.temperature }),
      ...(params.maxTokens === undefined ? {} : { maxTokens: params.maxTokens }),
      ...(params.json === undefined ? {} : { json: params.json }),
      ...(this.userId === undefined ? {} : { userId: this.userId }),
    });

    // Only the text. The `done` event carries usage, which the gateway has
    // already recorded by the time it reaches here.
    for await (const event of events) {
      if (event.type === "chunk" && event.text) yield event.text;
    }
  }
}
