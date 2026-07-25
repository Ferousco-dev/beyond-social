/**
 * Tiny fetch wrapper shared by the provider adapters. Using fetch rather than
 * per-vendor SDKs keeps this package dependency-free and swappable; each adapter
 * is a thin, typed shell over one REST endpoint.
 */
export async function postJson<T>(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`POST ${url} failed: ${response.status} ${text.slice(0, 500)}`);
  }
  return (await response.json()) as T;
}
