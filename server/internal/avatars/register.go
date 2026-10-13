package avatars

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"regexp"
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/storage"
)

type RegisterInput struct {
	StoragePath      string
	Name             string
	ConsentVersion   int
	ConsentConfirmed bool
	RerouteURL       string
	IdempotencyKey   string
}

// footagePath is what the recorder produces: {user id}/twin-{uuid}.{mp4|webm}.
var footagePath = regexp.MustCompile(`^[0-9a-f-]{36}/twin-[0-9a-f-]{36}\.(mp4|webm)$`)

// Register validates the recording and the person's consent, then records the
// avatar for the worker to submit to HeyGen. It returns immediately.
func (s *Service) Register(ctx context.Context, userID string, in RegisterInput) (Avatar, bool, error) {
	if !in.ConsentConfirmed || in.ConsentVersion != ConsentVersion {
		return Avatar{}, false, ErrConsentRequired
	}
	name, err := cleanName(in.Name)
	if err != nil {
		return Avatar{}, false, err
	}
	reroute, err := s.cleanReroute(in.RerouteURL)
	if err != nil {
		return Avatar{}, false, err
	}
	if len(in.IdempotencyKey) > 128 || strings.ContainsFunc(in.IdempotencyKey, func(r rune) bool { return r < 0x20 || r > 0x7e }) {
		return Avatar{}, false, fmt.Errorf("%w: invalid idempotency key", ErrInvalid)
	}
	// The path must be inside the caller's own folder: it is what proves the
	// recording belongs to them, since the client names the object.
	if !strings.HasPrefix(in.StoragePath, userID+"/") || !footagePath.MatchString(in.StoragePath) {
		return Avatar{}, false, fmt.Errorf("%w: recording does not belong to this account", ErrInvalid)
	}
	if err := s.checkFootage(ctx, in.StoragePath); err != nil {
		return Avatar{}, false, err
	}
	pending, err := s.repo.CountPending(ctx, userID)
	if err != nil {
		return Avatar{}, false, err
	}
	if pending >= maxPendingAvatar {
		return Avatar{}, false, ErrTooManyBusy
	}

	if s.quota != nil {
		if err := s.quota(ctx, userID); err != nil {
			return Avatar{}, false, err
		}
	}

	a, isNew, err := s.repo.Create(ctx, NewAvatar{
		UserID: userID, Name: name, StoragePath: in.StoragePath, ConsentVersion: ConsentVersion,
		RerouteURL: reroute, IdempotencyKey: in.IdempotencyKey,
	})
	if err != nil {
		return Avatar{}, false, err
	}
	a.Resolve(s.now())
	if !isNew {
		return a, false, nil
	}
	if s.biller != nil {
		if err := s.biller.Reserve(ctx, userID, a.ID); err != nil {
			// Not charged, so close the avatar rather than leave it for a worker.
			if _, failErr := s.repo.Advance(ctx, a.ID, Update{TrainingStatus: trainingFailed, Error: "not charged"}); failErr != nil {
				slog.Error("close unfunded avatar", "avatar_id", a.ID, "error", failErr)
			}
			return Avatar{}, false, err
		}
	}
	s.publish(a)
	return a, true, nil
}

func (s *Service) checkFootage(ctx context.Context, path string) error {
	info, err := s.footage.Stat(ctx, FootageBucket, path)
	if err == storage.ErrNotFound {
		return ErrFootageMissing
	}
	if err != nil {
		return err
	}
	if info.Size > MaxFootageBytes {
		return ErrFootageTooLarge
	}
	switch info.ContentType {
	case "", "video/mp4", "video/webm", "application/octet-stream":
		return nil
	}
	return ErrUnsupportedMedia
}

func (s *Service) cleanReroute(raw string) (string, error) {
	if raw == "" {
		return "", nil
	}
	u, err := url.Parse(raw)
	origin := ""
	if err == nil {
		origin = u.Scheme + "://" + u.Host
	}
	if err != nil || u.Host == "" || !slices.Contains(s.allowedOrigins, origin) {
		return "", fmt.Errorf("%w: return address is not allowed", ErrInvalid)
	}
	return raw, nil
}

func cleanName(raw string) (string, error) {
	n := strings.TrimSpace(raw)
	if n == "" {
		return defaultName, nil
	}
	if utf8.RuneCountInString(n) > maxNameRunes || strings.ContainsFunc(n, func(r rune) bool { return r < 0x20 }) {
		return "", fmt.Errorf("%w: name must be 1-%d characters", ErrInvalid, maxNameRunes)
	}
	return n, nil
}
