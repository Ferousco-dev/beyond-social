package orchestrator

import (
	"fmt"
	"slices"
	"strings"
)

type argRule struct {
	required bool
	minRunes int
	maxRunes int
	minInt   int64
	maxInt   int64
	oneOf    []string
}

// argSet is a tool's arguments: how they are checked, and how they are
// described to the planner. Keeping both in one place means the planner is
// never told something the validator will refuse.
type argSet struct {
	validate func(map[string]any) error
	docs     []string
}

func objectArgs(rules map[string]argRule, required ...string) argSet {
	return argSet{validate: validateObject(rules, required...), docs: describeRules(rules)}
}

// describeRules writes one line per argument, required ones first.
func describeRules(rules map[string]argRule) []string {
	names := make([]string, 0, len(rules))
	for name := range rules {
		names = append(names, name)
	}
	slices.SortFunc(names, func(a, b string) int {
		if rules[a].required != rules[b].required {
			if rules[a].required {
				return -1
			}
			return 1
		}
		return strings.Compare(a, b)
	})
	lines := make([]string, 0, len(names))
	for _, name := range names {
		rule := rules[name]
		label := name
		if rule.required {
			label += " (required)"
		}
		lines = append(lines, label+": "+describeRule(rule))
	}
	return lines
}

func describeRule(r argRule) string {
	switch {
	case len(r.oneOf) > 0:
		return "one of " + strings.Join(r.oneOf, ", ")
	case r.minInt != 0 || r.maxInt != 0:
		return fmt.Sprintf("a whole number from %d to %d", r.minInt, r.maxInt)
	case r.maxRunes > 0:
		return fmt.Sprintf("text, up to %d characters", r.maxRunes)
	}
	return "text"
}

// validateObject builds an arg validator: required presence, string length
// bounds, integer ranges, fixed vocabularies, and no unknown fields. Unknown
// fields are rejected so a plan cannot smuggle instructions past review.
func validateObject(rules map[string]argRule, required ...string) func(map[string]any) error {
	return func(args map[string]any) error {
		for name := range args {
			if _, ok := rules[name]; !ok {
				return fmt.Errorf("unknown argument %q", name)
			}
		}
		for _, name := range required {
			value, ok := args[name]
			if !ok || value == nil {
				return fmt.Errorf("missing required argument %q", name)
			}
			if s, isStr := value.(string); isStr && strings.TrimSpace(s) == "" {
				return fmt.Errorf("missing required argument %q", name)
			}
		}
		for name, rule := range rules {
			value, ok := args[name]
			if !ok || value == nil {
				continue
			}
			switch v := value.(type) {
			case string:
				runes := len([]rune(v))
				if rule.minRunes > 0 && runes < rule.minRunes {
					return fmt.Errorf("argument %q too short", name)
				}
				if rule.maxRunes > 0 && runes > rule.maxRunes {
					return fmt.Errorf("argument %q too long", name)
				}
				if len(rule.oneOf) > 0 {
					allowed := false
					for _, option := range rule.oneOf {
						if v == option {
							allowed = true
							break
						}
					}
					if !allowed {
						return fmt.Errorf("argument %q has unsupported value", name)
					}
				}
			case float64:
				if rule.minInt != 0 && int64(v) < rule.minInt {
					return fmt.Errorf("argument %q below minimum", name)
				}
				if rule.maxInt != 0 && int64(v) > rule.maxInt {
					return fmt.Errorf("argument %q above maximum", name)
				}
			default:
				return fmt.Errorf("argument %q has unsupported type", name)
			}
		}
		return nil
	}
}
