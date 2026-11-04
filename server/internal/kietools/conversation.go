package kietools

import (
	"context"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
)

// MaxTurns bounds one conversation: enough for a back-and-forth, few enough
// that one request cannot queue an unbounded number of paid videos.
const MaxTurns = 6

// Turn is one line of a conversation: a face lip-synced to a saved recording.
type Turn struct {
	FaceAssetID, VoiceAssetID, Script string
}

// SubmitConversation starts one lip-sync video per turn. Every turn is checked
// (ownership, consent, file kinds) before any job exists, so a bad turn costs
// nothing; the turns then start together and count as one busy slot, since
// the person asked for one video.
func (s *LiveAvatarService) SubmitConversation(ctx context.Context, userID string, turns []Turn, prompt, key string) ([]jobs.Job, error) {
	prompt = strings.TrimSpace(prompt)
	if s.library == nil || len(turns) < 2 || len(turns) > MaxTurns || utf8.RuneCountInString(prompt) > MaxPromptRunes || len(key) < 8 {
		return nil, ErrInvalid
	}
	inputs := make([]map[string]any, len(turns))
	for i, turn := range turns {
		script := strings.TrimSpace(turn.Script)
		if script == "" || utf8.RuneCountInString(script) > MaxSpeechRunes {
			return nil, ErrInvalid
		}
		chosen, err := s.fromLibrary(ctx, userID, turn.FaceAssetID, turn.VoiceAssetID)
		if err != nil {
			return nil, fmt.Errorf("turn %d: %w", i+1, err)
		}
		input, err := s.input(ctx, userID, chosen, script, prompt)
		if err != nil {
			return nil, fmt.Errorf("turn %d: %w", i+1, err)
		}
		input["turn"] = i + 1
		inputs[i] = input
	}
	active, err := s.jobs.CountActive(ctx, userID, JobLiveAvatar)
	if err != nil {
		return nil, err
	}
	if active >= maxActivePerUser {
		return nil, ErrTooManyBusy
	}
	started := make([]jobs.Job, 0, len(inputs))
	for i, input := range inputs {
		// One key per turn, so a retried request resumes instead of doubling.
		job, _, err := s.jobs.Create(ctx, userID, JobLiveAvatar, input, fmt.Sprintf("%s:turn-%d", key, i+1))
		if err != nil {
			return started, err
		}
		started = append(started, job)
	}
	return started, nil
}
