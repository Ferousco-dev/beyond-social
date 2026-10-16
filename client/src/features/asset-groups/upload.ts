import { confirmAttachment, requestAttachmentUpload } from "@/features/conversation/media-actions";
import { createClient } from "@/lib/supabase/client";

/**
 * Uploads one file into user storage and returns its media id. Upload-only:
 * nothing is recorded on this device, everything lands in the user's bucket.
 */
export async function uploadGroupFile(
  file: File,
): Promise<{ readonly status: "ok"; readonly mediaId: string } | { readonly status: "error"; readonly message: string }> {
  const slot = await requestAttachmentUpload({ name: file.name, mimeType: file.type, size: file.size });
  if (slot.status !== "ok") return { status: "error", message: slot.message };
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("user-media")
    .uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type });
  if (error) return { status: "error", message: error.message };
  const confirmed = await confirmAttachment(slot.id);
  if (confirmed.status !== "ok") return { status: "error", message: confirmed.message };
  return { status: "ok", mediaId: slot.id };
}
