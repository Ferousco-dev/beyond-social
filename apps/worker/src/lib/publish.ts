import { env } from "../config/env";

export interface PublishInput {
  platform: string;
  caption: string;
  hashtags: string;
  videoUrl: string | null;
}

export interface PublishResult {
  externalId: string;
}

// Integration boundary for the publishing provider (Upload-post / Blotato).
// It fails closed until credentials are wired so a post is never silently
// marked published. The real provider call slots in where noted.
export async function publishPost(_input: PublishInput): Promise<PublishResult> {
  if (!env.UPLOAD_POST_API_KEY) {
    throw new Error("Publishing provider is not configured");
  }

  // Real provider request (Upload-post / Blotato) goes here and returns the
  // provider's post id. Until it is wired, do not report success.
  throw new Error("Publishing provider integration is not implemented");
}
