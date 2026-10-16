package voices

import (
	"context"
	"errors"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/elevenlabs"
)

type fakeMedia struct {
	data []byte
	mime string
	err  error
}

func (f fakeMedia) Load(_ context.Context, _, _ string, _ int64) ([]byte, string, error) {
	if f.err != nil {
		return nil, "", f.err
	}
	return f.data, f.mime, nil
}

type fakeCloner struct {
	voiceID string
	err     error
}

func (f fakeCloner) AddVoice(_ context.Context, _ string, _ []elevenlabs.Sample) (string, error) {
	if f.err != nil {
		return "", f.err
	}
	return f.voiceID, nil
}

type fakeCloneRecords struct {
	saved map[string]string
}

func (f *fakeCloneRecords) SaveClone(_ context.Context, userID, providerVoiceID, name string) error {
	if f.saved == nil {
		f.saved = map[string]string{}
	}
	f.saved[userID+"/"+providerVoiceID] = name
	return nil
}

func TestCloneNeedsNameAudioAndConsentFreePath(t *testing.T) {
	newService := func() (*CloneService, *fakeCloneRecords) {
		records := &fakeCloneRecords{}
		return NewCloneService(records, fakeMedia{data: []byte("audio"), mime: "audio/mpeg"}, fakeCloner{voiceID: "v-1"}), records
	}
	service, records := newService()
	voice, err := service.Clone(context.Background(), "u1", "Feranmi", "media-1")
	if err != nil {
		t.Fatalf("clone: %v", err)
	}
	if voice.ID != "v-1" || voice.Scope != ScopeOwn {
		t.Fatalf("voice = %+v", voice)
	}
	if records.saved["u1/v-1"] != "Feranmi" {
		t.Fatalf("ownership was not recorded: %v", records.saved)
	}

	if _, err := service.Clone(context.Background(), "u1", "  ", "media-1"); err == nil {
		t.Fatal("nameless voices must fail")
	}
	noisy := NewCloneService(&fakeCloneRecords{}, fakeMedia{data: []byte("x"), mime: "image/png"}, fakeCloner{voiceID: "v-2"})
	if _, err := noisy.Clone(context.Background(), "u1", "Pic", "media-9"); err == nil {
		t.Fatal("pictures are not voice samples")
	}
	broken := NewCloneService(&fakeCloneRecords{}, fakeMedia{err: errors.New("gone")}, fakeCloner{voiceID: "v-3"})
	if _, err := broken.Clone(context.Background(), "u1", "Gone", "media-9"); err == nil {
		t.Fatal("unreadable samples must fail")
	}
}
