# Evaluation rubric

Every generated output is graded before it ships. The judge (an LLM) scores each
dimension 0..1 with a one-line rationale; deterministic checks feed in where a
rule is objective. The **weighted aggregate and pass/fail are computed by the
engine** from the recipe's versioned `evalPolicy`, not by the model, so the gate
is deterministic and auditable. Implementation: `evaluation/` in the engine.

| Dimension           | What it measures                                         |
| ------------------- | -------------------------------------------------------- |
| brandingConsistency | Adherence to brand tokens, voice, and system             |
| accessibility       | Contrast (WCAG AA), focus, labels, hit targets, keyboard |
| spacing             | Consistent rhythm on a spacing scale                     |
| typography          | Type scale, hierarchy, line length, pairing              |
| hierarchy           | Clear primary/secondary emphasis and scan path           |
| creativity          | Non-obvious solutions within constraints                 |
| originality         | Avoids the generic AI-template look                      |
| usability           | Clear actions, affordances, error prevention             |
| responsiveness      | Graceful across breakpoints                              |
| productQuality      | Reads like a senior team shipped it                      |
| consistency         | Internal coherence                                       |

## Policy

`threshold` is the minimum weighted aggregate to pass. `floors` are hard minimums
on individual dimensions (e.g. `accessibility >= 0.6`) that fail an output
regardless of aggregate. Below the bar, the judge's suggestions are fed back and
the output is regenerated up to `maxRegenerations`. Weights and thresholds live
in each recipe so eval behavior is versioned with the composition it grades.

## Deterministic checks

Objective rules run without the LLM and are authoritative:

- **Contrast** - `contrastRatio` / `meetsContrastAA` (`evaluation/checks.ts`).
- Extendable: spacing-scale conformance, type-scale conformance, token usage.

These both hard-gate and inform the judge, so accessibility is never a matter of
opinion.
