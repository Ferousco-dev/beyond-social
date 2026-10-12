package provider

import (
	"errors"
	"fmt"
	"testing"
)

func TestClassify(t *testing.T) {
	cases := map[string]struct {
		err  error
		want Class
	}{
		"402 payment required":   {&Error{Status: 402}, ClassQuota},
		"gemini quota 429":       {&Error{Status: 429, Transient: true, Code: "RESOURCE_EXHAUSTED", Message: "You exceeded your current quota"}, ClassQuota},
		"plain rate limit":       {&Error{Status: 429, Transient: true, Message: "slow down"}, ClassTransient},
		"billing hint on 400":    {&Error{Status: 400, Message: "billing account disabled"}, ClassQuota},
		"credit code":            {&Error{Status: 200, Code: "insufficient_credit"}, ClassQuota},
		"bad key":                {&Error{Status: 401, Message: "API key not valid"}, ClassAuth},
		"forbidden":              {&Error{Status: 403}, ClassAuth},
		"outage":                 {&Error{Status: 503, Transient: true}, ClassTransient},
		"connection dropped":     {&Error{Transient: true, Message: "request failed"}, ClassTransient},
		"bad request":            {&Error{Status: 400, Message: "invalid script"}, ClassRejected},
		"not a provider error":   {errors.New("boom"), ClassUnknown},
		"wrapped provider error": {fmt.Errorf("step: %w", &Error{Status: 402}), ClassQuota},
		"unauthorised with hint": {&Error{Status: 401, Message: "invalid billing token"}, ClassAuth},
	}
	for name, tc := range cases {
		if got := Classify(tc.err); got != tc.want {
			t.Errorf("%s: got %q want %q", name, got, tc.want)
		}
	}
	if !ClassQuota.NeedsAdmin() || !ClassAuth.NeedsAdmin() || ClassTransient.NeedsAdmin() || ClassRejected.NeedsAdmin() {
		t.Error("only quota and auth failures need an admin")
	}
}
