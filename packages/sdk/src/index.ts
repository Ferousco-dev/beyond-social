/**
 * Beyond Social API client.
 *
 * Deliberately dependency-free: it uses `fetch`, which every supported runtime
 * provides, so installing the SDK never drags a tree into a consumer's build.
 */

export interface Generation {
  id: string;
  prompt: string;
  status: "queued" | "generating" | "ready" | "failed";
  result_url: string | null;
  aspect_ratio: string;
  created_at: string;
}

export interface Usage {
  calls: number;
  cached_calls: number;
  failed_calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  p50_latency_ms: number;
}

export interface ClientOptions {
  apiKey: string;
  /** Override for self-hosted or staging deployments. */
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

/** Errors carry the status so callers can branch on 401 versus 429. */
export class BeyondSocialError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    /** Present on 429, taken from the Retry-After header. */
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "BeyondSocialError";
  }
}

const DEFAULT_BASE_URL = "https://beyondsocial.app/api/v1";

export class BeyondSocial {
  private readonly baseUrl: string;
  private readonly doFetch: typeof globalThis.fetch;

  constructor(private readonly options: ClientOptions) {
    if (!options.apiKey) throw new Error("An API key is required.");
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.doFetch = options.fetch ?? globalThis.fetch;
  }

  private async request<T>(path: string, query?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value);

    const response = await this.doFetch(url, {
      headers: { authorization: `Bearer ${this.options.apiKey}` },
    });

    if (!response.ok) {
      // The API returns a structured error, but a proxy or outage may not, so
      // parsing is best-effort and the status is always preserved.
      let code = "http_error";
      let message = `Request failed with ${response.status}`;
      try {
        const body = (await response.json()) as { error?: string; message?: string };
        code = body.error ?? code;
        message = body.message ?? message;
      } catch {
        // Keep the defaults.
      }
      const header = response.headers.get("retry-after");
      const retryAfter = header === null ? null : Number.parseInt(header, 10);
      throw new BeyondSocialError(
        message,
        response.status,
        code,
        Number.isFinite(retryAfter) ? retryAfter : null,
      );
    }

    return (await response.json()) as T;
  }

  /** Your generations, newest first. */
  async listGenerations(options: { limit?: number } = {}): Promise<Generation[]> {
    const query = options.limit === undefined ? undefined : { limit: String(options.limit) };
    const body = await this.request<{ data: Generation[] }>("/generations", query);
    return body.data;
  }

  /** AI spend and volume over the last 30 days. */
  async getUsage(): Promise<Usage | null> {
    const body = await this.request<{ data: Usage | null }>("/usage");
    return body.data;
  }
}
