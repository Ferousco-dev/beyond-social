package jobs

import "testing"

func TestValidateTransition(t *testing.T) {
	if err := ValidateTransition(StatusQueued, StatusRunning); err != nil {
		t.Fatalf("expected queued to running transition to be valid: %v", err)
	}

	if err := ValidateTransition(StatusReady, StatusQueued); err == nil {
		t.Fatal("expected ready to queued transition to be invalid")
	}
}

func TestNewJobSetsDefaults(t *testing.T) {
	job := NewJob("user-123", "generate-video", map[string]any{"prompt": "hello"})
	if job.UserID != "user-123" {
		t.Fatalf("unexpected user ID: %q", job.UserID)
	}
	if job.Status != StatusQueued {
		t.Fatalf("expected queued status, got %q", job.Status)
	}
	if job.Type != "generate-video" {
		t.Fatalf("unexpected job type: %q", job.Type)
	}
	if job.Input["prompt"] != "hello" {
		t.Fatal("expected input payload to be preserved")
	}
}

func TestValidateStatusRejectsUnknownValues(t *testing.T) {
	if err := ValidateStatus("not-a-status"); err == nil {
		t.Fatal("expected unknown status to be rejected")
	}
}
