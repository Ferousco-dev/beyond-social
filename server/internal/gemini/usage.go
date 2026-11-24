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

// Tag names the feature a model call is for, keeping any user and job already
// in the context, so spend can be read per feature.
func Tag(ctx context.Context, purpose string) context.Context {
	s := ScopeFrom(ctx)
	s.Purpose = purpose
	return WithScope(ctx, s)
}

// TagJob is Tag for work done for a job, where no signed-in request carries the user.
func TagJob(ctx context.Context, purpose, userID, jobID string) context.Context {
	return WithScope(ctx, Scope{UserID: userID, JobID: jobID, Purpose: purpose})
}

type outputKey struct{}

// WithOutputLimit raises the output budget for one call whose answer is long,
// such as a storyboard of many shots. It never lowers the default.
func WithOutputLimit(ctx context.Context, tokens int32) context.Context {
	return context.WithValue(ctx, outputKey{}, tokens)
}

func outputLimitFrom(ctx context.Context) int32 {
	n, _ := ctx.Value(outputKey{}).(int32)
	return n
}
