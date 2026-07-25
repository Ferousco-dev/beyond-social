/**
 * Minimal, strict frontmatter parser for authored chunk files. Supports exactly
 * the shapes our schema uses: `key: scalar`, inline arrays (`[a, b]`), block
 * arrays (`- item`), and one level of nesting (for `applicability`). This avoids
 * a YAML dependency for a controlled, in-repo authoring format; the result is
 * always validated by Zod downstream, so anything malformed fails loudly at
 * ingest rather than silently. To accept richer YAML later, replace only this
 * file with a call to the `yaml` package.
 */

export interface ParsedFile {
  data: Record<string, unknown>;
  body: string;
}

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

export function parseFrontmatter(raw: string): ParsedFile {
  const match = FRONTMATTER.exec(raw.replace(/\r\n/g, "\n"));
  if (!match) throw new Error("Missing frontmatter block delimited by '---'");
  const [, head = "", body = ""] = match;
  return { data: parseBlock(head.split("\n")), body: body.trim() };
}

function parseBlock(lines: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined || line.trim() === "" || line.trimStart().startsWith("#")) continue;
    if (leadingSpaces(line) > 0) continue; // consumed by their parent key below

    const { key, rest } = splitKey(line);
    if (rest === "") {
      const child = collectIndented(lines, i + 1);
      out[key] = child.every((l) => l.trimStart().startsWith("- "))
        ? child.map((l) => scalar(l.trimStart().slice(2)))
        : parseBlock(child.map((l) => l.replace(/^ {2}/, "")));
      i += child.length;
    } else {
      out[key] = scalar(rest);
    }
  }
  return out;
}

function collectIndented(lines: readonly string[], from: number): string[] {
  const block: string[] = [];
  for (let i = from; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) break;
    if (line.trim() === "") break;
    if (leadingSpaces(line) === 0) break;
    block.push(line);
  }
  return block;
}

function splitKey(line: string): { key: string; rest: string } {
  const idx = line.indexOf(":");
  if (idx === -1) throw new Error(`Invalid frontmatter line: ${line}`);
  return { key: line.slice(0, idx).trim(), rest: line.slice(idx + 1).trim() };
}

function leadingSpaces(line: string): number {
  return line.length - line.trimStart().length;
}

function scalar(value: string): unknown {
  const v = value.trim();
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim();
    return inner === "" ? [] : inner.split(",").map((item) => scalar(item));
  }
  const unquoted = v.replace(/^["']|["']$/g, "");
  if (unquoted !== v) return unquoted;
  if (v === "true") return true;
  if (v === "false") return false;
  if (v !== "" && !Number.isNaN(Number(v))) return Number(v);
  return v;
}
