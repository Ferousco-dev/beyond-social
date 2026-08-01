import { env } from "@/lib/env";

/**
 * The OpenAPI description of the public API.
 *
 * Written by hand and kept beside the routes rather than generated, because a
 * generated spec that drifts is worse than a short one that is correct. It is
 * small enough to keep honest: two endpoints, and the same auth scheme both use.
 */
export function buildOpenApiDocument(): Record<string, unknown> {
  const errorResponse = {
    type: "object",
    properties: { error: { type: "string" }, message: { type: "string" } },
    required: ["error"],
  };

  return {
    openapi: "3.1.0",
    info: {
      title: "Beyond Social API",
      version: "1.0.0",
      description:
        "Read access to your generations and AI usage. Authenticate with an API key created in the dashboard.",
    },
    servers: [{ url: `${env.NEXT_PUBLIC_APP_URL}/api/v1` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "API key" },
      },
      schemas: {
        Generation: {
          type: "object",
          properties: {
            id: { type: "string" },
            prompt: { type: "string" },
            status: { type: "string", enum: ["queued", "generating", "ready", "failed"] },
            result_url: {
              type: ["string", "null"],
              description:
                "Signed download link, null until the run is ready. Expires roughly an hour after it is issued; fetch the file rather than storing the URL.",
            },
            aspect_ratio: { type: "string" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Usage: {
          type: "object",
          properties: {
            calls: { type: "integer" },
            cached_calls: { type: "integer" },
            failed_calls: { type: "integer" },
            input_tokens: { type: "integer" },
            output_tokens: { type: "integer" },
            cost_usd: { type: "number" },
            p50_latency_ms: { type: "integer" },
          },
        },
        Error: errorResponse,
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/generations": {
        get: {
          summary: "List generations",
          description: "Your generations, newest first.",
          parameters: [
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            },
          ],
          responses: {
            "200": {
              description: "A list of generations",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      object: { type: "string", enum: ["list"] },
                      data: { type: "array", items: { $ref: "#/components/schemas/Generation" } },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Missing or invalid API key",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
            "429": {
              description: "Rate limited; see the Retry-After header",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
          },
        },
      },
      "/usage": {
        get: {
          summary: "Get usage",
          description: "AI spend and volume over the last 30 days.",
          responses: {
            "200": {
              description: "Usage summary",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      object: { type: "string", enum: ["usage"] },
                      period_days: { type: "integer" },
                      data: { $ref: "#/components/schemas/Usage" },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Missing or invalid API key",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
          },
        },
      },
    },
  };
}
