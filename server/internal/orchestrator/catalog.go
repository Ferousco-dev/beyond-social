package orchestrator

import (
	"fmt"
	"strings"

	"google.golang.org/genai"
)

// Catalog describes every tool in use for the planner's prompt: what it does,
// what it costs or exposes, its arguments, and what later steps can reference.
// It is built from the registry, so it can never disagree with the validator.
func (r *Registry) Catalog() string {
	var b strings.Builder
	for _, tool := range r.Tools() {
		b.WriteString("- " + tool.Name)
		switch {
		case tool.Public:
			b.WriteString(" [posts publicly, needs approval]")
		case tool.Billable:
			b.WriteString(" [costs credits]")
		case tool.ReadOnly:
			b.WriteString(" [read only]")
		}
		b.WriteString(": " + tool.Description + "\n")
		for _, line := range tool.Args {
			b.WriteString("    arg " + line + "\n")
		}
		for _, out := range tool.Outputs {
			fmt.Fprintf(&b, "    gives %s (%s): %s\n", out.Path, out.Kind, out.Description)
		}
	}
	return strings.TrimRight(b.String(), "\n")
}

// PlanResponseSchema constrains the model to the plan shape and the registered
// tool names. Schema enforcement is a backstop; Go validation is authoritative.
func (r *Registry) PlanResponseSchema() *genai.Schema {
	str := func(desc string, maxRunes int64) *genai.Schema {
		return &genai.Schema{Type: genai.TypeString, Description: desc, MaxLength: &maxRunes}
	}
	strList := func(desc string) *genai.Schema {
		return &genai.Schema{Type: genai.TypeArray, Description: desc, Items: &genai.Schema{Type: genai.TypeString}}
	}
	return &genai.Schema{
		Type: genai.TypeObject,
		Properties: map[string]*genai.Schema{
			"version":      {Type: genai.TypeInteger, Description: "Always 1."},
			"objective":    str("The user's objective in one sentence.", 500),
			"missing_info": strList("Questions for the user when essential inputs are missing. Empty when the plan is executable."),
			"unsupported":  strList("Requested actions no registered tool can perform. Empty when everything is covered."),
			"steps": {
				Type:        genai.TypeArray,
				Description: "Ordered workflow steps. Empty when clarification is needed.",
				MaxItems:    func() *int64 { n := int64(MaxSteps); return &n }(),
				Items: &genai.Schema{
					Type: genai.TypeObject,
					Properties: map[string]*genai.Schema{
						"id":      str("Unique step id, lowercase letters, digits, dash, underscore.", 32),
						"tool":    {Type: genai.TypeString, Format: "enum", Enum: r.Names(), Description: "One registered tool."},
						"args":    {Type: genai.TypeObject, Description: "Tool arguments, exactly as the tool lists them. A value may be ${step_id.output_path} to use something an earlier step made."},
						"needs":   strList("Ids of steps that must complete first."),
						"confirm": {Type: genai.TypeBoolean, Description: "True when this step needs explicit user approval."},
					},
				},
			},
		},
	}
}
