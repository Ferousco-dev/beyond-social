import { confirmAttachment, requestAttachmentUpload } from "@/features/conversation/media-actions";
import { standardType, withStandardType } from "@/lib/file-type";
import { createClient } from "@/lib/supabase/client";

/**
 * Uploads one file into user storage and returns its media id. Upload-only:
 * nothing is recorded on this device, everything lands in the user's bucket.
 */
export async function uploadGroupFile(
  file: File,
): Promise<{ readonly status: "ok"; readonly mediaId: string } | { readonly status: "error"; readonly message: string }> {
  const type = standardType(file.type);
  const slot = await requestAttachmentUpload({ name: file.name, mimeType: type, size: file.size });
  if (slot.status !== "ok") return { status: "error", message: slot.message };
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("user-media")
    .uploadToSignedUrl(slot.path, slot.token, withStandardType(file), { contentType: type });
  if (error) return { status: "error", message: error.message };
  const confirmed = await confirmAttachment(slot.id);
  if (confirmed.status !== "ok") return { status: "error", message: confirmed.message };
  return { status: "ok", mediaId: slot.id };
}
