package chat

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/Ferousco-dev/beyond-social/server/internal/orchestrator"
)

// Workflows is the part of the orchestrator chat uses.
type Workflows interface {
	Submit(ctx context.Context, userID, objective string, view orchestrator.ContextView, idempotencyKey string) (orchestrator.Workflow, error)
}

// WorkflowPlanner turns a request into a workflow and describes the result in
// plain words. The words are written here, not by the model, so what the user
// reads is always what was actually planned.
type WorkflowPlanner struct {
	workflows Workflows
	registry  *orchestrator.Registry
}

func NewWorkflowPlanner(w Workflows, registry *orchestrator.Registry) *WorkflowPlanner {
	return &WorkflowPlanner{workflows: w, registry: registry}
}

func (p *WorkflowPlanner) Plan(ctx context.Context, userID, request string, history []Turn, key string) (Outcome, error) {
	view := orchestrator.ContextView{}
	for _, t := range history {
		view.Turns = append(view.Turns, orchestrator.ContextTurn{Role: string(t.Role), Content: t.Content})
	}
	wf, err := p.workflows.Submit(ctx, userID, request, view, key)
	if errors.Is(err, orchestrator.ErrTooManyWorkflows) {
		return Outcome{}, ErrBusy
	}
	if err != nil {
		return Outcome{}, err
	}
	return Outcome{WorkflowID: wf.ID, Reply: p.describe(wf)}, nil
}

func (p *WorkflowPlanner) describe(wf orchestrator.Workflow) string {
	var b strings.Builder
	switch wf.Status {
	case orchestrator.WorkflowAwaitingClarification:
		b.WriteString("I need a little more before I can start:")
		for _, q := range stringList(wf.Plan["missing_info"]) {
			b.WriteString("\n- " + q)
		}
	case orchestrator.WorkflowAwaitingApproval:
		b.WriteString("Here is the plan. Nothing starts until you approve it:")
		p.writeSteps(&b, wf)
	default:
		b.WriteString("On it. Here is what I am doing:")
		p.writeSteps(&b, wf)
	}
	if un := stringList(wf.Plan["unsupported"]); len(un) > 0 {
		b.WriteString("\n\nI cannot do this yet: " + strings.Join(un, "; ") + ".")
	}
	return b.String()
}

func (p *WorkflowPlanner) writeSteps(b *strings.Builder, wf orchestrator.Workflow) {
	for i, step := range wf.Steps {
		label := step.Tool
		if tool, ok := p.registry.Get(step.Tool); ok {
			label, _, _ = strings.Cut(tool.Description, ".")
		}
		fmt.Fprintf(b, "\n%d. %s", i+1, label)
	}
}

func stringList(v any) []string {
	items, _ := v.([]any)
	out := make([]string, 0, len(items))
	for _, item := range items {
		if s, ok := item.(string); ok && s != "" {
			out = append(out, s)
		}
	}
	return out
}
