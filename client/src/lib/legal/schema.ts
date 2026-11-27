export interface LegalDocument {
  /** A draft is shown with a notice that it is awaiting review before launch. */
  readonly status: "draft" | "published";
  readonly title: string;
  /** When the text last changed, shown at the top so readers can tell a revision apart. */
  readonly updated: string;
  readonly summary: string;
  /** Paragraphs are separated by a blank line. A line starting with "## " is a heading. */
  readonly body: string;
}

export type LegalDocumentKind = "privacy" | "terms";
