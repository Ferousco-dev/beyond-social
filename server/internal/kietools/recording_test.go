package kietools

import (
	"context"
	"errors"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/assets"
)

type groups map[string]assets.GroupDetail

func (g groups) Detail(_ context.Context, _, id string) (assets.GroupDetail, error) {
	detail, ok := g[id]
	if !ok {
		return assets.GroupDetail{}, errors.New("no such group")
	}
	return detail, nil
}

func TestASavedGroupIsPricedByItsVoiceRecording(t *testing.T) {
	service := NewLiveAvatarService(&countingJobs{}, groups{
		"with-voice": {Voice: &assets.SlotView{MediaID: "ada.mp3"}},
		"no-voice":   {},
	}, nil, recordings{})

	seconds, err := service.GroupRecordingSeconds(t.Context(), "u", "with-voice")
	if err != nil || seconds != 1 {
		t.Fatalf("seconds = %d, err = %v", seconds, err)
	}
	if _, err := service.GroupRecordingSeconds(t.Context(), "u", "no-voice"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("a group without a recording: %v", err)
	}
}
