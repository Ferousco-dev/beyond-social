import { estimateTokens } from "./tokens";

export interface Section {
  /** Heading path, e.g. "Pricing > Anchoring"; empty for the lead section. */
  heading: string;
  text: string;
}

const MAX_SECTION_TOKENS = 512;

/**
 * Split a body into retrievable sections. Authored chunks are already scoped to
 * one concept, so most files yield a single section; multi-part files split on
 * H2 (`## `). Any section still over the token ceiling is split again on
 * paragraph boundaries so no single embedding spans too much surface area
 * (which dilutes similarity). Heading context is preserved for retrieval.
 */
export function splitSections(body: string): Section[] {
  const byHeading = splitOnH2(body);
  const sections: Section[] = [];
  for (const section of byHeading) {
    if (estimateTokens(section.text) <= MAX_SECTION_TOKENS) {
      sections.push(section);
      continue;
    }
    for (const part of splitParagraphs(section.text, MAX_SECTION_TOKENS)) {
      sections.push({ heading: section.heading, text: part });
    }
  }
  return sections.filter((s) => s.text.trim() !== "");
}

function splitOnH2(body: string): Section[] {
  const lines = body.split("\n");
  const sections: Section[] = [];
  let heading = "";
  let buffer: string[] = [];

  const flush = (): void => {
    const text = buffer.join("\n").trim();
    if (text !== "") sections.push({ heading, text });
    buffer = [];
  };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flush();
      heading = line.slice(3).trim();
    } else {
      buffer.push(line);
    }
  }
  flush();
  return sections.length > 0 ? sections : [{ heading: "", text: body.trim() }];
}

function splitParagraphs(text: string, maxTokens: number): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const parts: string[] = [];
  let current: string[] = [];
  let tokens = 0;
  for (const para of paragraphs) {
    const cost = estimateTokens(para);
    if (tokens + cost > maxTokens && current.length > 0) {
      parts.push(current.join("\n\n"));
      current = [];
      tokens = 0;
    }
    current.push(para);
    tokens += cost;
  }
  if (current.length > 0) parts.push(current.join("\n\n"));
  return parts;
}
