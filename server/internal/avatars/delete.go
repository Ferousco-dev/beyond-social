package avatars

import (
	"context"
	"log/slog"

	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
)

// Delete erases an avatar everywhere it lives: at HeyGen (the character and the
// voice cloned from the recording), in storage, and here. HeyGen is asked first
// and a refusal stops the deletion, so the person is never told their likeness
// is gone while a trained copy still exists. Repeating it after a partial
// failure is safe; anything already gone counts as deleted.
func (s *Service) Delete(ctx context.Context, userID, id string) error {
	a, err := s.repo.Get(ctx, userID, id)
	if err != nil {
		return err
	}
	if a.GroupID != "" {
		if err := s.provider.DeleteAvatarGroup(ctx, a.GroupID); err != nil {
			return err
		}
	}
	// The cloned voice is the person's voice, so it goes too, unless something
	// else still uses it (HeyGen does not remove it with the avatar).
	if a.TwinVoiceID != "" {
		inUse, err := s.repo.VoiceInUse(ctx, a.TwinVoiceID, a.ID)
		if err != nil {
			return err
		}
		if !inUse {
			if err := s.provider.DeleteVoice(ctx, a.TwinVoiceID); err != nil {
				return err
			}
		}
	}
	if a.StoragePath != "" {
		if err := s.footage.Delete(ctx, FootageBucket, a.StoragePath); err != nil {
			slog.Warn("could not delete recording while deleting avatar", "avatar_id", a.ID, "error", err)
		}
	}
	if _, err := s.repo.Delete(ctx, userID, id); err != nil {
		return err
	}
	if s.publisher != nil {
		if event, err := realtime.NewEvent(EventDeleted, a.ID, map[string]string{"id": a.ID}); err == nil {
			s.publisher.Publish(userID, event)
		}
	}
	return nil
}

// SetDefault makes a ready avatar the one used when none is named.
func (s *Service) SetDefault(ctx context.Context, userID, id string) (Avatar, error) {
	a, err := s.repo.SetDefault(ctx, userID, id)
	if err != nil {
		return Avatar{}, err
	}
	a.Resolve(s.now())
	s.publish(a)
	return a, nil
}
