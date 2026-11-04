type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  readonly method?: RequestMethod;
  readonly anonymous?: boolean;
}

export function buildRequestConfig(options: RequestOptions = {}): RequestInit {
  return {
    method: options.method ?? "GET",
    ...(options.anonymous
      ? {
          cache: "force-cache" as const,
          next: { revalidate: 300 },
        }
      : {
          cache: "no-store" as const,
        }),
  };
}
