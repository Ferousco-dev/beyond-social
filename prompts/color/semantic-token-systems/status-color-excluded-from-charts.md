---
id: semantic-token-systems-status-color-excluded-from-charts
title: Do not reuse semantic status colors as a categorical chart palette
category: color-system
subcategory: data-visualization
tags: [data-viz, charts, semantic-color, categorical-palette]
applicability:
  platforms: [web]
  productTypes: [saas-dashboard]
  styles: []
source: authored
version: 1
priorQuality: 0.85
---

Semantic tokens (success, warning, danger, info) mean something specific and
fixed, "this state is good/bad/needs attention," so they should never double
as the default color set for an arbitrary categorical chart, where color
order carries no such meaning.

- Maintain a separate categorical/qualitative palette for charts, distinct
  hues chosen for maximum pairwise distinguishability, not repurposed
  semantic tokens.
- The one exception: when a chart specifically visualizes status counts (e.g.
  a bar for "failed," "pending," "succeeded" jobs), semantic tokens are
  correct there because the categories genuinely map to those meanings.
- For any other categorical dimension, revenue by region, users by plan tier,
  never let "danger red" land on an arbitrary category just because it was
  next in the default color array, a user will misread that category as
  problematic.
- Keep the chart palette and the semantic palette visually distinct enough
  (different hue family or saturation) that a glance at a legend does not
  create a false semantic read.

Why: color in a chart legend is interpreted relative to any other color
meaning the viewer already holds, and status tokens are usually the
strongest-learned color association in the whole product. Putting "danger
red" on a chart segment for, say, the West region, silently tells the user
something is wrong with the West region, even though the chart author meant
nothing by it, purely because the color was recycled from the wrong system.

Example: a job-status bar chart legitimately using `success-solid`,
`warning-solid`, and `danger-solid` for succeeded/pending/failed counts,
while a separate revenue-by-region chart uses an unrelated categorical
palette (teal, violet, amber-adjacent-but-distinct, slate).
Counter-example: a revenue-by-plan-tier pie chart where the Enterprise
segment happens to render in the app's danger red, because the developer
pulled colors from `--danger-solid, --warning-solid, --success-solid` in
array order for an unrelated dataset.
