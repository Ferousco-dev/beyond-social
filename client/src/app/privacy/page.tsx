import { type Metadata } from "next";

import { LegalDocumentPage } from "@/components/landing/legal-document-page";
import { getLegalDocument } from "@/lib/legal/documents";

export const metadata: Metadata = { title: "Privacy policy" };
export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  return <LegalDocumentPage document={await getLegalDocument("privacy")} />;
}
