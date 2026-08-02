// deno-lint-ignore-file no-explicit-any
// Handing user-supplied files to the provider.
//
// Everything a render takes as input, a photo to animate or a voice clip to
// lip-sync, lives in a private bucket of ours. The provider cannot read that,
// and passing a signed link fails in two ways: in local development the link is
// a 127.0.0.1 address that resolves to the provider's own machine, and in
// production it expires two hours after it is minted, so a render sitting in a
// queue longer than that dies on an expired URL with the credit already
// reserved.
//
// So the bytes are read here, over the platform's internal network, and pushed
// to the provider. Our storage never has to be reachable from outside.
import { uploadFile } from "./kie.ts";
import { log } from "./trace.ts";

/**
 * Reads one object and returns a provider-hosted URL for it.
 *
 * Takes a path rather than a URL for the same reason the thread stores paths:
 * a signed URL is a fact that expires, and a path is not.
 */
export async function handToProvider(
  supabase: any,
  bucket: string,
  path: string,
  /** Nullable, not optional: `traceIdFrom` returns null when there is no header. */
  traceId?: string | null,
): Promise<string> {
  const { data: file, error } = await supabase.storage.from(bucket).download(path);
  if (error || !file) {
    throw new Error(`could not read ${bucket}/${path}: ${error?.message ?? "no file"}`);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  // The name carries the extension, which is how the provider infers the type.
  const fileName = path.split("/").pop() ?? "upload";
  const url = await uploadFile(bytes, fileName);

  log("info", "handed a reference file to the provider", {
    traceId,
    bucket,
    bytes: bytes.length,
  });
  return url;
}
