package orchestrator

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

type countingReporter struct{ n int }

func (c *countingReporter) Report(_ context.Context, err error, _ alerts.Context) provider.Class {
	c.n++
	return provider.Classify(err)
}

func TestProviderFailuresNeverReachTheUserVerbatim(t *testing.T) {
	rep := &countingReporter{}
	s := &Service{deps: Deps{Alerts: rep}}
	step := &Step{Tool: "plan"}

	leaky := &provider.Error{Provider: "gemini", Status: 429, Code: "RESOURCE_EXHAUSTED", Message: "quota exceeded for key AIza-secret"}
	text := s.safeText(context.Background(), Workflow{UserID: "u"}, step, leaky)
	if text != provider.UserMessage || strings.Contains(text, "AIza") {
		t.Fatalf("got %q", text)
	}
	if rep.n != 1 {
		t.Fatal("the admin must be told")
	}
	if got := s.safeText(context.Background(), Workflow{}, step, errors.New("job not found")); got != "job not found" {
		t.Fatalf("our own validation messages are still shown: %q", got)
	}
}
