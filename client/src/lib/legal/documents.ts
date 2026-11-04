import { PRIVACY } from "./privacy";
import { type LegalDocument, type LegalDocumentKind } from "./schema";
import { TERMS } from "./terms";

export type { LegalDocument, LegalDocumentKind } from "./schema";

const DOCUMENTS: Readonly<Record<LegalDocumentKind, LegalDocument>> = { privacy: PRIVACY, terms: TERMS };

/** The legal text lives in the repository, so changing it is a reviewed change rather than a database edit. */
export function getLegalDocument(kind: LegalDocumentKind): LegalDocument {
  return DOCUMENTS[kind];
}
