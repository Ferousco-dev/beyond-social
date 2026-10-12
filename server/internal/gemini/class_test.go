package gemini

import (
	"errors"
	"fmt"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"google.golang.org/genai"
)

func TestQuotaExhaustionIsClassifiedAndNeverRetried(t *testing.T) {
	err := wrapError(genai.APIError{Code: 429, Status: "RESOURCE_EXHAUSTED", Message: "You exceeded your current quota, check your billing"})
	if provider.Classify(err) != provider.ClassQuota || retryable(err) {
		t.Fatalf("class=%q retryable=%v", provider.Classify(err), retryable(err))
	}
}

func TestRateLimitsAndOutagesStillRetry(t *testing.T) {
	for _, code := range []int{429, 500, 503} {
		err := wrapError(genai.APIError{Code: code, Message: "try later"})
		if !retryable(err) || provider.Classify(err) != provider.ClassTransient {
			t.Errorf("%d should be a retryable transient failure", code)
		}
	}
}

func TestKeyProblemsAreAuthAndNotRetried(t *testing.T) {
	for _, code := range []int{401, 403} {
		err := wrapError(genai.APIError{Code: code, Message: "API key not valid"})
		if provider.Classify(err) != provider.ClassAuth || retryable(err) {
			t.Errorf("%d: class=%q", code, provider.Classify(err))
		}
	}
}

func TestOtherErrorsKeepTheirCause(t *testing.T) {
	cause := errors.New("network down")
	err := wrapError(fmt.Errorf("wrapped: %w", cause))
	if !errors.Is(err, cause) {
		t.Fatal("the underlying error must stay reachable")
	}
}
