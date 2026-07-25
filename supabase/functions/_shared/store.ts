// deno-lint-ignore-file no-explicit-any
// Copies a finished render from the (temporary) provider URL into the durable
// `renders` bucket and returns the permanent public URL. Falls back to the
// source URL if the copy fails, so a storage hiccup never loses the result.
export async function persistRender(
  admin: any,
  userId: string,
  taskId: string,
  sourceUrl: string,
): Promise<string> {
  const response = await fetch(sourceUrl);
  if (!response.ok) return sourceUrl;

  const bytes = new Uint8Array(await response.arrayBuffer());
  const path = `${userId}/${taskId}.mp4`;

  const { error } = await admin.storage
    .from("renders")
    .upload(path, bytes, { contentType: "video/mp4", upsert: true });
  if (error) return sourceUrl;

  const { data } = admin.storage.from("renders").getPublicUrl(path);
  return data?.publicUrl ?? sourceUrl;
}
