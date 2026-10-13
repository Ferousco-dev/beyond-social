package avatars

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

// MaxAvatars is how many avatars one user may keep (the database enforces it too).
const MaxAvatars = 5

var uploadExtensions = map[string]string{"video/mp4": "mp4", "video/webm": "webm"}

// UploadTicket is a one-time slot for uploading one recording. The browser
// uploads straight to storage with Token; the path is chosen here, inside the
// user's own folder, never by the client.
type UploadTicket struct {
	Path  string `json:"path"`
	Token string `json:"token"`
}

// NewUploadTicket checks the format and the avatar limit before handing out a
// slot, so a doomed upload is refused before it starts. HeyGen only accepts
// MP4 and WebM, so QuickTime (.mov) is refused here with a clear reason.
func (s *Service) NewUploadTicket(ctx context.Context, userID, contentType string) (UploadTicket, error) {
	ext, ok := uploadExtensions[baseType(contentType)]
	if !ok {
		return UploadTicket{}, ErrUnsupportedMedia
	}
	existing, err := s.repo.List(ctx, userID, MaxAvatars, 0)
	if err != nil {
		return UploadTicket{}, err
	}
	if len(existing) >= MaxAvatars {
		return UploadTicket{}, ErrLimitReached
	}
	path := fmt.Sprintf("%s/twin-%s.%s", userID, uuid.NewString(), ext)
	token, err := s.footage.SignedUploadToken(ctx, FootageBucket, path)
	if err != nil {
		return UploadTicket{}, err
	}
	return UploadTicket{Path: path, Token: token}, nil
}

func baseType(contentType string) string {
	base, _, _ := strings.Cut(contentType, ";")
	return strings.ToLower(strings.TrimSpace(base))
}
