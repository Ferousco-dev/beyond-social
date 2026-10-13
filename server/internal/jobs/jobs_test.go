package jobs

import (
	"errors"
	"testing"
)

func TestValidateTransition(t *testing.T) {
	valid := [][2]Status{
		{StatusQueued, StatusRunning}, {StatusQueued, StatusFailed}, {StatusQueued, StatusReady},
		{StatusRunning, StatusCompleted}, {StatusRunning, StatusFailed}, {StatusRunning, StatusReady},
	}
	for _, p := range valid {
		if err := ValidateTransition(p[0], p[1]); err != nil {
			t.Errorf("%s -> %s should be allowed: %v", p[0], p[1], err)
		}
	}

	invalid := [][2]Status{
		{StatusQueued, StatusCompleted}, {StatusQueued, StatusQueued}, {StatusRunning, StatusQueued},
		{StatusCompleted, StatusRunning}, {StatusFailed, StatusQueued}, {StatusReady, StatusQueued},
		{StatusQueued, Status("bogus")}, {Status("bogus"), StatusRunning},
	}
	for _, p := range invalid {
		if err := ValidateTransition(p[0], p[1]); !errors.Is(err, ErrInvalidTransition) {
			t.Errorf("%s -> %s should be ErrInvalidTransition, got %v", p[0], p[1], err)
		}
	}
}

func TestTerminalStatuses(t *testing.T) {
	for status, want := range map[Status]bool{
		StatusQueued: false, StatusRunning: false, StatusCompleted: true, StatusFailed: true, StatusReady: true, Status("x"): false,
	} {
		if got := status.Terminal(); got != want {
			t.Errorf("%s.Terminal() = %v, want %v", status, got, want)
		}
	}
}

func TestNewJob(t *testing.T) {
	job, err := NewJob("user-1", "discover", map[string]any{"q": "x"})
	if err != nil {
		t.Fatal(err)
	}
	if job.UserID != "user-1" || job.Type != "discover" || job.Status != StatusQueued || job.Input["q"] != "x" {
		t.Fatalf("unexpected job %+v", job)
	}

	if j, _ := NewJob("user-1", "discover", nil); j.Input == nil {
		t.Fatal("nil input should become an empty object")
	}
	for name, args := range map[string][2]string{"no user": {"", "t"}, "no type": {"u", ""}, "long type": {"u", string(make([]byte, 65))}} {
		if _, err := NewJob(args[0], args[1], nil); !errors.Is(err, ErrInvalidInput) {
			t.Errorf("%s: expected ErrInvalidInput, got %v", name, err)
		}
	}
}
