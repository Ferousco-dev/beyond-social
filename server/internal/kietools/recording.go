package kietools

import (
	"context"
	"errors"
	"math"

	"github.com/Ferousco-dev/beyond-social/server/internal/assetlib"
	"github.com/Ferousco-dev/beyond-social/server/internal/kie"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/Ferousco-dev/beyond-social/server/internal/mediatime"
)

// MaxRecordingSeconds is the longest voice recording the lip-sync model takes.
const MaxRecordingSeconds = 300

// assumedBitsPerSecond sizes a recording whose headers cannot be read. It is
// low on purpose, so the estimate errs long and the reservation covers it.
const assumedBitsPerSecond = 32_000

var errRecordingTooLong = errors.Join(ErrInvalid, errors.New("that voice recording is longer than 5 minutes"))

// recordingSeconds reads how long a voice recording plays, in whole seconds
// rounded up, from its own headers.
func (s *LiveAvatarService) recordingSeconds(ctx context.Context, userID, mediaID string) (int, error) {
	if s.files == nil {
		return 0, errors.New("kietools: recordings cannot be read")
	}
	data, mimeType, err := s.files.Load(ctx, userID, mediaID, kie.MaxInputBytes)
	if err != nil {
		if errors.Is(err, media.ErrNotFound) || errors.Is(err, media.ErrNotUploaded) || errors.Is(err, media.ErrTooLarge) {
			return 0, ErrInvalid
		}
		return 0, err
	}
	seconds, ok := mediatime.Seconds(data, mimeType)
	if !ok {
		seconds = float64(len(data)) * 8 / assumedBitsPerSecond
	}
	whole := max(int(math.Ceil(seconds)), 1)
	if whole > MaxRecordingSeconds {
		return 0, errRecordingTooLong
	}
	return whole, nil
}

// GroupRecordingSeconds measures the voice recording a saved asset group holds,
// so a video made from that group can be priced before it is made.
func (s *LiveAvatarService) GroupRecordingSeconds(ctx context.Context, userID, groupID string) (int, error) {
	if s.groups == nil {
		return 0, ErrInvalid
	}
	group, err := s.groups.Detail(ctx, userID, groupID)
	if err != nil {
		return 0, err
	}
	if group.Voice == nil {
		return 0, ErrInvalid
	}
	return s.recordingSeconds(ctx, userID, group.Voice.MediaID)
}

// RecordingSeconds totals how long the given library voice recordings play,
// so a talking video or a conversation can be priced before it is made.
func (s *LiveAvatarService) RecordingSeconds(ctx context.Context, userID string, voiceAssetIDs []string) (int, error) {
	if s.library == nil {
		return 0, ErrInvalid
	}
	total := 0
	for _, id := range voiceAssetIDs {
		voice, err := s.library.Usable(ctx, userID, id, assetlib.KindVoice)
		if err != nil {
			return 0, libraryErr(err)
		}
		seconds, err := s.recordingSeconds(ctx, userID, voice.MediaID)
		if err != nil {
			return 0, err
		}
		total += seconds
	}
	return total, nil
}
