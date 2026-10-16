package httpserver

import (
	"context"
	"fmt"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/avatars"
	"github.com/Ferousco-dev/beyond-social/server/internal/avatarvideo"
	"github.com/Ferousco-dev/beyond-social/server/internal/elevenlabs"
	"github.com/Ferousco-dev/beyond-social/server/internal/heygen"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
	"github.com/Ferousco-dev/beyond-social/server/internal/storage"
	"github.com/Ferousco-dev/beyond-social/server/internal/voices"
)

const avatarFootage = alice + "/twin-1b2c3d4e-0000-4000-8000-000000000001.mp4"

// heygenFixture wires the avatar, voice and video services to in-memory fakes.
type heygenFixture struct {
	repo         *fakeAvatarRepo
	provider     *fakeHeygen
	avatars      *avatars.Service
	voices       *voices.Service
	videoService *avatarvideo.Service
	processor    *avatarvideo.Processor
}

func newHeygenFixture(jobService *jobs.Service, pub realtime.Publisher) *heygenFixture {
	f := &heygenFixture{repo: &fakeAvatarRepo{rows: map[string]avatars.Avatar{}}, provider: &fakeHeygen{video: heygen.Video{Status: heygen.VideoProcessing}}}
	f.voices = voices.NewService(fakeVoiceRecords{}, &fakeElevenVoices{})
	f.avatars = avatars.NewService(f.repo, fakeFootage{}, f.provider, pub, []string{"https://app.example.com"}).WithVoices(f.voices)
	f.videoService = avatarvideo.NewService(jobService, f.avatars, f.voices)
	f.processor = &avatarvideo.Processor{Jobs: jobService, Avatars: f.avatars, Provider: f.provider}
	return f
}

type fakeElevenVoices struct{}

func (fakeElevenVoices) LibraryVoices(context.Context) ([]elevenlabs.LibraryVoice, error) {
	return []elevenlabs.LibraryVoice{{ID: "lib-1", Name: "Ava"}}, nil
}

func (fakeElevenVoices) VoiceExists(_ context.Context, id string) (bool, error) {
	return id == "lib-1", nil
}

// seedReady gives userID a ready avatar and returns its ID.
func (f *heygenFixture) seedReady(userID, id string) {
	f.repo.rows[id] = avatars.Avatar{ID: id, UserID: userID, Name: "Sarah", TrainingStatus: "ready", LookID: "look-1",
		GroupID: "group-1", TwinVoiceID: "voice-own", VoiceID: "voice-own", CreatedAt: time.Now(), UpdatedAt: time.Now()}
}

type fakeAvatarRepo struct {
	rows map[string]avatars.Avatar
	seq  int
}

func (f *fakeAvatarRepo) Create(_ context.Context, n avatars.NewAvatar) (avatars.Avatar, bool, error) {
	if n.IdempotencyKey != "" {
		for _, a := range f.rows {
			if a.UserID == n.UserID && a.Name == "key:"+n.IdempotencyKey {
				return a, false, nil
			}
		}
	}
	f.seq++
	a := avatars.Avatar{ID: fmt.Sprintf("40000000-0000-4000-8000-%012d", f.seq), UserID: n.UserID, Name: n.Name, StoragePath: n.StoragePath,
		TrainingStatus: "pending", CreatedAt: time.Now(), UpdatedAt: time.Now()}
	if n.IdempotencyKey != "" {
		a.Name = "key:" + n.IdempotencyKey
	}
	f.rows[a.ID] = a
	return a, true, nil
}

func (f *fakeAvatarRepo) Get(_ context.Context, userID, id string) (avatars.Avatar, error) {
	if a, ok := f.rows[id]; ok && a.UserID == userID {
		return a, nil
	}
	return avatars.Avatar{}, avatars.ErrNotFound
}

func (f *fakeAvatarRepo) List(_ context.Context, userID string, limit, offset int) ([]avatars.Avatar, error) {
	var out []avatars.Avatar
	for _, a := range f.rows {
		if a.UserID == userID {
			out = append(out, a)
		}
	}
	if offset >= len(out) {
		return nil, nil
	}
	return out[offset:min(offset+limit, len(out))], nil
}

func (f *fakeAvatarRepo) CountPending(_ context.Context, userID string) (int, error) {
	n := 0
	for _, a := range f.rows {
		if a.UserID == userID && a.TrainingStatus == "pending" {
			n++
		}
	}
	return n, nil
}

func (f *fakeAvatarRepo) SelectVoice(_ context.Context, userID, id, voiceID string) (avatars.Avatar, error) {
	a, err := f.Get(context.Background(), userID, id)
	if err != nil {
		return avatars.Avatar{}, err
	}
	a.VoiceID = voiceID
	f.rows[id] = a
	return a, nil
}

func (f *fakeAvatarRepo) Delete(_ context.Context, userID, id string) (bool, error) {
	if a, ok := f.rows[id]; ok && a.UserID == userID {
		delete(f.rows, id)
		return true, nil
	}
	return false, nil
}

func (f *fakeAvatarRepo) SetDefault(_ context.Context, userID, id string) (avatars.Avatar, error) {
	a, err := f.Get(context.Background(), userID, id)
	if err != nil {
		return avatars.Avatar{}, err
	}
	if a.TrainingStatus != "ready" {
		return avatars.Avatar{}, avatars.ErrNotReady
	}
	a.IsDefault = true
	f.rows[id] = a
	return a, nil
}

func (f *fakeAvatarRepo) VoiceInUse(context.Context, string, string) (bool, error) { return false, nil }

func (f *fakeAvatarRepo) Claim(context.Context, int, time.Duration) ([]avatars.Avatar, error) {
	return nil, nil
}
func (f *fakeAvatarRepo) Advance(context.Context, string, avatars.Update) (avatars.Avatar, error) {
	return avatars.Avatar{}, nil
}
func (f *fakeAvatarRepo) FootageGone(context.Context, string, *time.Time) error { return nil }

type fakeFootage struct{}

func (fakeFootage) Stat(context.Context, string, string) (storage.Info, error) {
	return storage.Info{Size: 1 << 20, ContentType: "video/mp4"}, nil
}
func (fakeFootage) SignedURL(context.Context, string, string, time.Duration) (string, error) {
	return "https://storage.example/x", nil
}
func (fakeFootage) SignedUploadToken(context.Context, string, string) (string, error) {
	return "upload-token", nil
}
func (fakeFootage) Delete(context.Context, string, string) error { return nil }

type fakeVoiceRecords struct{}

func (fakeVoiceRecords) OwnVoices(_ context.Context, userID string) ([]voices.Voice, error) {
	if userID == alice {
		return []voices.Voice{{ID: "voice-own", Name: "Sarah (cloned voice)", Scope: voices.ScopeOwn}}, nil
	}
	return nil, nil
}

func (fakeVoiceRecords) Ownership(_ context.Context, userID, voiceID string) (bool, bool, error) {
	switch voiceID {
	case "voice-own":
		return userID == alice, userID != alice, nil
	}
	return false, false, nil
}

type fakeHeygen struct {
	video     heygen.Video
	creates   int
	deleteErr error
}

func (f *fakeHeygen) CreateDigitalTwin(context.Context, string, string, string) (heygen.Twin, error) {
	return heygen.Twin{}, nil
}
func (f *fakeHeygen) DeleteAvatarGroup(context.Context, string) error { return f.deleteErr }
func (f *fakeHeygen) DeleteVoice(context.Context, string) error       { return nil }

func (f *fakeHeygen) GetGroup(context.Context, string) (heygen.Twin, error) {
	return heygen.Twin{}, nil
}
func (f *fakeHeygen) GetLook(context.Context, string) (heygen.Twin, error) { return heygen.Twin{}, nil }
func (f *fakeHeygen) CreateConsent(context.Context, string, string, string) (string, error) {
	return "https://consent.heygen/new", nil
}

func (f *fakeHeygen) ListVoices(_ context.Context, q heygen.VoiceQuery) (heygen.VoicePage, error) {
	return heygen.VoicePage{Voices: []heygen.Voice{{ID: "lib-1", Name: "Ava", Language: "English"}}, HasMore: q.Token == "", NextToken: "n2"}, nil
}

func (f *fakeHeygen) GetVoice(_ context.Context, id string) (heygen.Voice, bool, error) {
	return heygen.Voice{ID: id}, id == "lib-1", nil
}

func (f *fakeHeygen) CreateVideo(context.Context, heygen.VideoRequest, string) (string, error) {
	f.creates++
	return "v_1", nil
}

func (f *fakeHeygen) GetVideo(context.Context, string) (heygen.Video, error) { return f.video, nil }
