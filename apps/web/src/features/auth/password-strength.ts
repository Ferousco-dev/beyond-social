export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  readonly score: StrengthLevel;
  readonly label: string;
}

const LABELS: Record<StrengthLevel, string> = {
  0: "Too weak",
  1: "Weak",
  2: "Fair",
  3: "Good",
  4: "Strong",
};

/**
 * Lightweight, dependency-free strength heuristic for live UI feedback. It is a
 * guide, not the security boundary: the real policy is enforced server-side and
 * by Supabase. Breach checking (HIBP k-anonymity) can be layered on separately.
 */
export function estimatePasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) {
    return { score: 0, label: LABELS[0] };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  // Penalise obvious low-entropy patterns.
  if (/^(.)\1+$/.test(password) || /^(?:0123|1234|abcd|qwer|pass)/i.test(password)) {
    score = Math.min(score, 1);
  }

  const clamped = Math.max(0, Math.min(4, score)) as StrengthLevel;
  return { score: clamped, label: LABELS[clamped] };
}
