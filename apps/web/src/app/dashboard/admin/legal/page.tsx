import { type Metadata } from "next";

import { LegalDocumentEditor } from "@/features/admin/components/legal-document-editor";
import { getLegalDocument } from "@/lib/legal/documents";

export const metadata: Metadata = { title: "Admin · Legal" };

export default async function LegalAdminPage() {
  const [privacy, terms] = await Promise.all([
    getLegalDocument("privacy"),
    getLegalDocument("terms"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Legal pages</h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Draft and publish the public privacy and terms pages. Keep them on “Coming soon” until the
        final wording has been reviewed by qualified counsel.
      </p>
      <div className="mt-6 space-y-4">
        <LegalDocumentEditor kind="privacy" initial={privacy} />
        <LegalDocumentEditor kind="terms" initial={terms} />
      </div>
    </div>
  );
}
