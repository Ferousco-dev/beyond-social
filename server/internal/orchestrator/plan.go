package orchestrator

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
)

// PlanVersion is the only plan schema version the executor understands.
// Gemini is instructed to emit exactly this version; anything else is rejected
// rather than migrated, so a silent shape change can never reach execution.
const PlanVersion = 1

const (
	// MaxSteps bounds cost and runaway tool chains.
	MaxSteps = 8
	// MaxObjectiveRunes keeps prompts reviewable.
	MaxObjectiveRunes = 500
	// MaxMissingInfo caps clarification rounds per plan.
	MaxMissingInfo = 5
)

var stepIDPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,31}$`)

// PlanStep is one validated unit of work. Args are validated against the tool's
// own schema at plan time and re-validated at execution time.
type PlanStep struct {
	ID      string         `json:"id"`
	Tool    string         `json:"tool"`
	Args    map[string]any `json:"args"`
	Needs   []string       `json:"needs"`
	Confirm bool           `json:"confirm"`
}

// Plan is the structured output Gemini produces for a workflow request.
type Plan struct {
	Version     int        `json:"version"`
	Objective   string     `json:"objective"`
	Steps       []PlanStep `json:"steps"`
	MissingInfo []string   `json:"missing_info"`
	Unsupported []string   `json:"unsupported"`
}

// RequiresClarification reports whether the plan asks for information instead
// of executable steps. Such plans never reach the executor.
func (p Plan) RequiresClarification() bool {
	return len(p.MissingInfo) > 0
}

// RequiresApproval reports whether any step spends money or acts externally.
func (p Plan) RequiresApproval(registry *Registry) bool {
	for _, step := range p.Steps {
		tool, ok := registry.Get(step.Tool)
		if !ok {
			return true
		}
		if tool.Billable || tool.Public || step.Confirm {
			return true
		}
	}
	return false
}

// ValidatePlan checks structure, dependencies, and tool allowlisting. Unknown
// tools, unknown steps, cycles, and over-limit plans are rejected here, before
// anything is persisted or executed.
func ValidatePlan(plan Plan, registry *Registry) error {
	if plan.Version != PlanVersion {
		return fmt.Errorf("orchestrator: unsupported plan version %d", plan.Version)
	}
	if strings.TrimSpace(plan.Objective) == "" {
		return errors.New("orchestrator: objective is required")
	}
	if len([]rune(plan.Objective)) > MaxObjectiveRunes {
		return errors.New("orchestrator: objective too long")
	}
	if len(plan.Steps) == 0 {
		// A clarification plan carries questions instead of steps. Anything
		// else must name at least one executable step.
		if len(plan.MissingInfo) == 0 {
			return errors.New("orchestrator: plan has no steps")
		}
		return nil
	}
	if len(plan.Steps) > MaxSteps {
		return fmt.Errorf("orchestrator: too many steps (%d, max %d)", len(plan.Steps), MaxSteps)
	}
	if len(plan.MissingInfo) > MaxMissingInfo {
		return errors.New("orchestrator: too many clarification questions")
	}

	ids := make(map[string]int, len(plan.Steps))
	for i, step := range plan.Steps {
		if !stepIDPattern.MatchString(step.ID) {
			return fmt.Errorf("orchestrator: invalid step id %q", step.ID)
		}
		if _, dup := ids[step.ID]; dup {
			return fmt.Errorf("orchestrator: duplicate step id %q", step.ID)
		}
		ids[step.ID] = i

		tool, ok := registry.Get(step.Tool)
		if !ok {
			return fmt.Errorf("orchestrator: unregistered tool %q", step.Tool)
		}
		if step.Args == nil {
			return fmt.Errorf("orchestrator: step %q has no args", step.ID)
		}
		if err := tool.ValidateArgs(step.Args); err != nil {
			return fmt.Errorf("orchestrator: step %q: %w", step.ID, err)
		}
		for _, need := range step.Needs {
			if need == step.ID {
				return fmt.Errorf("orchestrator: step %q depends on itself", step.ID)
			}
		}
	}
	for _, step := range plan.Steps {
		for _, need := range step.Needs {
			if _, ok := ids[need]; !ok {
				return fmt.Errorf("orchestrator: step %q needs unknown step %q", step.ID, need)
			}
		}
	}
	if cycle := findCycle(plan.Steps); cycle != "" {
		return fmt.Errorf("orchestrator: dependency cycle at step %q", cycle)
	}
	return nil
}

// findCycle returns a step id participating in a dependency cycle, or "".
func findCycle(steps []PlanStep) string {
	const (
		white = 0 // unvisited
		gray  = 1 // on the current path
		black = 2 // done
	)
	color := make(map[string]int, len(steps))
	edges := make(map[string][]string, len(steps))
	for _, step := range steps {
		edges[step.ID] = step.Needs
	}
	var visit func(id string) string
	visit = func(id string) string {
		color[id] = gray
		for _, need := range edges[id] {
			switch color[need] {
			case gray:
				return need
			case white:
				if hit := visit(need); hit != "" {
					return hit
				}
			}
		}
		color[id] = black
		return ""
	}
	for _, step := range steps {
		if color[step.ID] == white {
			if hit := visit(step.ID); hit != "" {
				return hit
			}
		}
	}
	return ""
}
