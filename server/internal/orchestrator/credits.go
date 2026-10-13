package orchestrator

import (
	"context"
	"errors"
)

// CreditsChecker is the seam where provider spend control plugs in. The Go
// backend has no credit ledger yet: approval gates plus per-user concurrency
// caps are the enforced controls today, and every billable step still passes
// through this check so a ledger can take over without touching the engine.
type CreditsChecker interface {
	Check(ctx context.Context, userID, tool string, approved bool) error
}

// ErrInsufficientCredits denies a billable step with a message safe for clients.
var ErrInsufficientCredits = errors.New("insufficient credits for this operation")

// AllowAll approves every check. Tests only; never wire this in production.
type AllowAll struct{}

// Check implements CreditsChecker.
func (AllowAll) Check(_ context.Context, _, _ string, _ bool) error { return nil }

// ApprovalGate is the production checker until a ledger exists. Read-only
// tools always pass; billable tools pass only inside an approved workflow,
// which the engine holds structurally. It records nothing and promises no
// balances: exact spend remains the provider's accounting.
type ApprovalGate struct {
	registry *Registry
}

// NewApprovalGate binds the gate to the tool registry.
func NewApprovalGate(registry *Registry) ApprovalGate { return ApprovalGate{registry: registry} }

// Check implements CreditsChecker.
func (g ApprovalGate) Check(_ context.Context, _ string, tool string, approved bool) error {
	descriptor, ok := g.registry.Get(tool)
	if !ok {
		return errors.New("orchestrator: unregistered tool")
	}
	if descriptor.Billable && !approved {
		return ErrInsufficientCredits
	}
	return nil
}
