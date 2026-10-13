import { type Metadata } from "next";

import { LegalDocumentPage } from "@/components/landing/legal-document-page";
import { getLegalDocument } from "@/lib/legal/documents";

export const metadata: Metadata = { title: "Terms and conditions" };
export default function TermsPage() {
  return <LegalDocumentPage document={getLegalDocument("terms")} />;
}
