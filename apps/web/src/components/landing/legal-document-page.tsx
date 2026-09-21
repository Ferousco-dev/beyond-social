import { Clock3 } from "lucide-react";

import { PageShell, Prose } from "@/components/landing/page-shell";
import { type LegalDocument } from "@/lib/legal/documents";

export function LegalDocumentPage({ document }: { readonly document: LegalDocument }) {
  return (
    <PageShell eyebrow="Legal" title={document.title} lede={document.summary}>
      <div className="rounded-2xl border border-hairline bg-paper p-6 sm:p-8">
        {document.status === "coming_soon" ? (
          <div className="mb-6 flex items-center gap-2 text-sm font-medium text-ink">
            <Clock3 className="size-4 text-primary" aria-hidden />
            Coming soon
          </div>
        ) : null}
        <Prose>
          {document.body.split(/\n{2,}/).map((paragraph, index) => (
            <p key={`${index}-${paragraph}`}>{paragraph}</p>
          ))}
        </Prose>
      </div>
    </PageShell>
  );
}
