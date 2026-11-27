// Every correction we make becomes a rule here, so CI refuses the same mistake
// twice. Each rule says which fix it came from. Add one with every fix; never
// delete one to make a build pass. A line can opt out with a comment naming the
// rule, "guard-allow: <id>", on it or the line above, when the exception is real.

/** Class strings and other literals on a line: "…", '…' and `…`. */
const LITERAL = /"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`/g;

function literals(line) {
  return [...line.matchAll(LITERAL)].map((match) => match[1] ?? match[2] ?? match[3] ?? "");
}

const tokens = (text) => text.split(/\s+/u).filter(Boolean);

export const RULES = [
  {
    id: "no-em-dash",
    fix: "Owner rule, broken on 26 Nov 2026: placeholders used an em dash.",
    message: "Em dashes are not used anywhere. Use a colon, a comma, or a hyphen.",
    files: /\.(tsx?|mjs|css)$/u,
    line: (text) => text.includes("—"),
  },
  {
    id: "no-blue-field-focus",
    fix: "26 Nov 2026: text fields showed a thick blue ring on focus.",
    message: "Fields focus with the neutral border in globals.css, not focus:outline-primary.",
    files: /\.tsx$/u,
    line: (text) => /\bfocus:outline-primary\b/u.test(text),
  },
  {
    id: "no-black-action-buttons",
    fix: "26 Nov 2026: action buttons were black; the brand colour is blue.",
    message: "Buttons use the .btn classes (blue primary), not bg-ink with light text.",
    files: /\.tsx$/u,
    line: (text) =>
      literals(text).some((value) => {
        const parts = tokens(value);
        return parts.includes("bg-ink") && (parts.includes("text-paper") || parts.includes("text-canvas"));
      }),
  },
  {
    id: "no-decorative-dot",
    fix: "26 Nov 2026: small blue dots were used as decoration.",
    message: "No decorative dots. Say it in words or with an icon.",
    files: /\.tsx$/u,
    line: (text) =>
      literals(text).some((value) => {
        const parts = tokens(value);
        const small = parts.some((part) => /^size-(1|1\.5|2|2\.5)$/u.test(part));
        return small && parts.includes("rounded-full") && parts.some((part) => /^bg-(primary|info|blue-\d+)$/u.test(part));
      }),
  },
  {
    id: "no-sparkle-ai-icon",
    fix: "26 Nov 2026: the owner hates the sparkle icon used for AI in the editor.",
    message: "AI is shown with the clean Lightbulb icon, never Sparkles, Sparkle or WandSparkles.",
    files: /\.tsx?$/u,
    line: (text) => /(?<!["'])\b(Sparkles|Sparkle|WandSparkles|Wand2)\b(?!["'])/u.test(text),
  },
  {
    id: "no-letter-platform-logo",
    fix: "27 Nov 2026: the landing post panel showed TikTok as a T in a black circle.",
    message: "Platforms always show their real logo. Use <PlatformLogo platform=\"tiktok\" />, never a letter in a circle.",
    files: /\.tsx$/u,
    line: (text) => /rounded-full[^"]*"[^>]*>\s*(T|IG|I|Y|YT)\s*<\//u.test(text),
  },
  {
    id: "admin-compact",
    fix: "26 Nov 2026: admin inputs and rows were too tall.",
    message: "Admin controls are 28 to 36 px tall: use h-7 to h-9, never h-10 or taller.",
    files: /\.tsx$/u,
    scope: /(app\/dashboard\/admin|features\/admin)/u,
    line: (text) => literals(text).some((value) => tokens(value).some((part) => /^(min-)?h-1[0-9]$/u.test(part))),
  },
];

/** Literal app paths in a line, such as "/dashboard/admin/docs". Templates with ${…} are skipped. */
export function appPaths(line) {
  return literals(line)
    .filter((value) => /^\/dashboard(\/|$)/u.test(value) && !value.includes("${"))
    .map((value) => value.split(/[?#]/u)[0].replace(/\/$/u, "") || "/");
}

/** Whether a path matches a page route; "[id]" in a route matches any one segment. */
export function routeExists(path, routes) {
  const parts = path.split("/").filter(Boolean);
  return routes.some((route) => {
    const want = route.split("/").filter(Boolean);
    return want.length === parts.length && want.every((segment, index) => segment.startsWith("[") || segment === parts[index]);
  });
}

/**
 * Server files may take components from a "use client" file, but not plain
 * values: those arrive as client references and fail at runtime, which no
 * typecheck or build catches.
 */
export function clientValueImports(source, isClientModule) {
  if (/^\s*["']use client["']/u.test(source)) return [];
  const found = [];
  const pattern = /import\s+(type\s+)?\{([^}]*)\}\s+from\s+["']([^"']+)["']/gu;
  for (const match of source.matchAll(pattern)) {
    if (match[1] || !isClientModule(match[3])) continue;
    const names = match[2]
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part !== "" && !part.startsWith("type "))
      .map((part) => part.split(/\s+as\s+/u).pop() ?? part);
    // A component is PascalCase with a lower-case letter in it; CONSTANTS and functions are not.
    const values = names.filter((name) => !/^[A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*$/u.test(name));
    if (values.length > 0) {
      const line = source.slice(0, match.index).split("\n").length;
      found.push({ line, names: values, from: match[3] });
    }
  }
  return found;
}
