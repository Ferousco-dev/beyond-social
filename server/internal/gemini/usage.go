package gemini

import "context"

// Record is one successful model call, as stored for spend reconciliation.
type Record struct {
	Provider string
	Model    string
	Purpose  string
	UserID   string
	JobID    string
	Usage    Usage
}

// Recorder stores usage records. Recording must never fail a user's request, so
// implementations report problems themselves and the client ignores them.
type Recorder interface {
	RecordUsage(ctx context.Context, r Record)
}

// Scope says who and what a model call is for. Callers add it to the context;
// anything left empty is simply stored as unknown.
type Scope struct {
	UserID  string
	JobID   string
	Purpose string
}

type scopeKey struct{}

func WithScope(ctx context.Context, s Scope) context.Context {
	return context.WithValue(ctx, scopeKey{}, s)
}

func ScopeFrom(ctx context.Context) Scope {
	s, _ := ctx.Value(scopeKey{}).(Scope)
	return s
}
