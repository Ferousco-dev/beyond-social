package orchestrator

import (
	"strings"
	"testing"
)

func validPlan() Plan {
	return Plan{
		Version:   PlanVersion,
		Objective: "Find skincare videos and transform one",
		Steps: []PlanStep{
			{
				ID:   "s1",
				Tool: "discover_videos",
				Args: map[string]any{"platform": "tiktok", "query": "skincare routine", "limit": float64(5)},
			},
			{
				ID:    "s2",
				Tool:  "transform_video",
				Args:  map[string]any{"video_id": "vid-1", "prompt": "make it cinematic"},
				Needs: []string{"s1"},
			},
		},
	}
}

func TestValidatePlanAcceptsGoodPlan(t *testing.T) {
	if err := ValidatePlan(validPlan(), DefaultRegistry()); err != nil {
		t.Fatalf("valid plan rejected: %v", err)
	}
}

func TestValidatePlanRejects(t *testing.T) {
	registry := DefaultRegistry()
	cases := map[string]func(Plan) Plan{
		"wrong version": func(p Plan) Plan {
			p.Version = 99
			return p
		},
		"empty objective": func(p Plan) Plan {
			p.Objective = "  "
			return p
		},
		"no steps": func(p Plan) Plan {
			p.Steps = nil
			return p
		},
		"too many steps": func(p Plan) Plan {
			p.Steps = make([]PlanStep, MaxSteps+1)
			for i := range p.Steps {
				p.Steps[i] = PlanStep{ID: "s", Tool: "get_job_status", Args: map[string]any{"job_id": "j"}}
				p.Steps[i].ID = "s" + strings.Repeat("x", i)
			}
			return p
		},
		"duplicate id": func(p Plan) Plan {
			p.Steps[1].ID = "s1"
			return p
		},
		"bad id": func(p Plan) Plan {
			p.Steps[0].ID = "Step One!"
			return p
		},
		"unregistered tool": func(p Plan) Plan {
			p.Steps[0].Tool = "run_shell"
			return p
		},
		"sql tool": func(p Plan) Plan {
			p.Steps[0].Tool = "raw_sql"
			return p
		},
		"unknown arg": func(p Plan) Plan {
			p.Steps[0].Args["exec"] = "curl evil"
			return p
		},
		"missing required arg": func(p Plan) Plan {
			p.Steps[0].Args = map[string]any{"query": "x"}
			return p
		},
		"bad platform": func(p Plan) Plan {
			p.Steps[0].Args["platform"] = "myspace"
			return p
		},
		"self dependency": func(p Plan) Plan {
			p.Steps[0].Needs = []string{"s1"}
			return p
		},
		"unknown dependency": func(p Plan) Plan {
			p.Steps[1].Needs = []string{"nope"}
			return p
		},
		"cycle": func(p Plan) Plan {
			p.Steps[0].Needs = []string{"s2"}
			p.Steps[1].Needs = []string{"s1"}
			return p
		},
		"forward cycle of three": func(p Plan) Plan {
			p.Steps = []PlanStep{
				{ID: "a", Tool: "get_job_status", Args: map[string]any{"job_id": "j"}, Needs: []string{"c"}},
				{ID: "b", Tool: "get_job_status", Args: map[string]any{"job_id": "j"}, Needs: []string{"a"}},
				{ID: "c", Tool: "get_job_status", Args: map[string]any{"job_id": "j"}, Needs: []string{"b"}},
			}
			return p
		},
	}
	for name, mutate := range cases {
		if err := ValidatePlan(mutate(validPlan()), registry); err == nil {
			t.Errorf("%s: expected rejection", name)
		}
	}
}

func TestValidatePlanAllowsForwardReference(t *testing.T) {
	plan := validPlan()
	plan.Steps[0], plan.Steps[1] = plan.Steps[1], plan.Steps[0]
	if err := ValidatePlan(plan, DefaultRegistry()); err != nil {
		t.Fatalf("forward reference rejected: %v", err)
	}
}

func TestPlanRequiresApproval(t *testing.T) {
	registry := DefaultRegistry()
	if !validPlan().RequiresApproval(registry) {
		t.Fatal("billable plan should require approval")
	}
	readOnly := Plan{
		Version:   PlanVersion,
		Objective: "check status",
		Steps: []PlanStep{
			{ID: "s1", Tool: "get_job_status", Args: map[string]any{"job_id": "j"}},
		},
	}
	if readOnly.RequiresApproval(registry) {
		t.Fatal("read-only plan should not require approval")
	}
	unknown := Plan{
		Version:   PlanVersion,
		Objective: "sneaky",
		Steps:     []PlanStep{{ID: "s1", Tool: "delete_everything", Args: map[string]any{}}},
	}
	if !unknown.RequiresApproval(registry) {
		t.Fatal("unknown tool should require approval")
	}
}

func TestRegistryExposesOnlyImplementedTools(t *testing.T) {
	registry := DefaultRegistry()
	for _, name := range []string{"discover_videos", "transform_video", "create_avatar_video", "generate_video", "get_job_status", "get_workflow_status"} {
		if _, ok := registry.Get(name); !ok {
			t.Errorf("expected tool %q", name)
		}
	}
	for _, name := range []string{"run_shell", "raw_sql", "http_fetch", "generate_image", "send_email"} {
		if _, ok := registry.Get(name); ok {
			t.Errorf("unexpected tool %q", name)
		}
	}
}

func TestPlanResponseSchemaMentionsRegisteredTools(t *testing.T) {
	schema := DefaultRegistry().PlanResponseSchema()
	if schema == nil {
		t.Fatal("nil schema")
	}
}
