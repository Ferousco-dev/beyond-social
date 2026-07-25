/**
 * Input and output moderation.
 *
 * Deliberately narrow: this catches categories that are unambiguous and cheap to
 * screen deterministically, and it is applied to what we generate and publish on
 * a user's behalf. It is not a general content classifier, and it is not a
 * substitute for a provider moderation endpoint or human review on appeal.
 *
 * The bias is toward flagging for review rather than silently blocking, because
 * a false positive that stops a creator publishing is itself a real cost.
 */

export const MODERATION_CATEGORIES = [
  "violence",
  "sexual-minors",
  "self-harm",
  "hate",
  "malware",
  "credentials",
] as const;
export type ModerationCategory = (typeof MODERATION_CATEGORIES)[number];

export type ModerationAction = "allow" | "review" | "block";

export interface ModerationFinding {
  category: ModerationCategory;
  action: ModerationAction;
}

export interface ModerationVerdict {
  action: ModerationAction;
  findings: readonly ModerationFinding[];
}

interface Rule {
  category: ModerationCategory;
  test: RegExp;
  /** Categories where a match is never acceptable are blocked outright. */
  action: Extract<ModerationAction, "review" | "block">;
}

const RULES: readonly Rule[] = [
  {
    category: "sexual-minors",
    test: /\b(child|minor|underage|preteen|teen)\b[^.]{0,25}\b(sexual|nude|explicit|porn)/i,
    action: "block",
  },
  {
    category: "self-harm",
    test: /\b(how to|best way to|instructions? for)\b[^.]{0,25}\b(kill myself|suicide|self.harm)/i,
    action: "block",
  },
  {
    category: "violence",
    test: /\b(how to|instructions? for|build a)\b[^.]{0,30}\b(bomb|explosive|bioweapon|nerve agent)/i,
    action: "block",
  },
  {
    category: "malware",
    test: /\b(write|generate|create)\b[^.]{0,25}\b(ransomware|keylogger|botnet|rootkit)/i,
    action: "block",
  },
  {
    category: "hate",
    test: /\b(all|every)\s+\w+\s+(people|men|women)\s+(are|should be)\s+(killed|eliminated|exterminated)/i,
    action: "block",
  },
  {
    // Not harmful content, but a strong signal that a secret is about to be sent
    // to a provider, which is worth stopping to look at.
    category: "credentials",
    test: /\b(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/,
    action: "review",
  },
];

export function moderate(text: string): ModerationVerdict {
  const findings: ModerationFinding[] = [];

  for (const rule of RULES) {
    if (rule.test.test(text)) findings.push({ category: rule.category, action: rule.action });
  }

  const action: ModerationAction = findings.some((finding) => finding.action === "block")
    ? "block"
    : findings.length > 0
      ? "review"
      : "allow";

  return { action, findings };
}

export class ModerationError extends Error {
  constructor(
    readonly stage: "input" | "output",
    readonly verdict: ModerationVerdict,
  ) {
    super(`Blocked by ${stage} moderation: ${verdict.findings.map((f) => f.category).join(", ")}`);
    this.name = "ModerationError";
  }
}

export class InjectionError extends Error {
  constructor(readonly patterns: readonly string[]) {
    super(`Blocked as prompt injection: ${patterns.join(", ")}`);
    this.name = "InjectionError";
  }
}
