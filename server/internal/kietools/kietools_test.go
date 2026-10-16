package kietools

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/assets"
	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/Ferousco-dev/beyond-social/server/internal/transform"
	"google.golang.org/genai"
)

const picture = "10000000-0000-4000-8000-000000000001"

func TestEditNeedsOneToFourPicturesAndRefusesExtras(t *testing.T) {
	ok := map[string]any{"prompt": "bright office", "image_media_ids": []any{picture}, "image_urls": []any{"https://files.example/a.png"}}
	if e, err := ParseEdit(ok); err != nil || len(e.Pictures) != 2 {
		t.Fatalf("edit = %+v err = %v", e, err)
	}
	five := []any{picture, picture, picture, picture, picture}
	for name, args := range map[string]map[string]any{
		"no pictures":  {"prompt": "x"},
		"five":         {"prompt": "x", "image_media_ids": five},
		"no prompt":    {"image_media_ids": []any{picture}},
		"bad id":       {"prompt": "x", "image_media_ids": []any{"../etc"}},
		"http link":    {"prompt": "x", "image_urls": []any{"http://files.example/a.png"}},
		"bad ratio":    {"prompt": "x", "image_media_ids": []any{picture}, "aspect_ratio": "2:1"},
		"extra":        {"prompt": "x", "image_media_ids": []any{picture}, "model": "other"},
		"prompt limit": {"prompt": strings.Repeat("a", MaxPromptRunes+1), "image_media_ids": []any{picture}},
	} {
		if _, err := ParseEdit(args); !errors.Is(err, ErrInvalid) {
			t.Errorf("%s: err = %v", name, err)
		}
	}
}

type liveGroups struct{ group assets.GroupDetail }

func (g liveGroups) Detail(context.Context, string, string) (assets.GroupDetail, error) {
	return g.group, nil
}

type speaker struct{ voice, text string }

func (s *speaker) Speak(_ context.Context, voiceID, _ string, text string) ([]byte, error) {
	s.voice, s.text = voiceID, text
	return []byte("mp3"), nil
}

func TestLiveAvatarBuildsElevenLabsSpeechBeforeSubmittingKIEVideo(t *testing.T) {
	face := assets.SlotView{MediaID: picture, Kind: "image"}
	now := time.Now()
	group := assets.GroupDetail{Group: assets.Group{FaceConsent: &now, VoiceConsent: &now}, Face: &face}
	sp := &speaker{}
	up := &uploader{}
	b := LiveAvatarBuilder{Builder: Builder{Files: &files{}, Fetcher: fetcher{}, Uploader: up}, Groups: liveGroups{group: group}, Speaker: sp}
	prepared, err := b.BuildLiveAvatar(context.Background(), jobs.Job{UserID: "u", Input: map[string]any{"group_id": "g", "voice_id": "voice-owned", "script": "Hello there", "prompt": "Calm direct-to-camera delivery."}})
	if err != nil || prepared.Model != ModelTalk || sp.voice != "voice-owned" || sp.text != "Hello there" || up.n != 2 {
		t.Fatalf("prepared=%+v err=%v voice=%q text=%q uploads=%d", prepared, err, sp.voice, sp.text, up.n)
	}
	if prepared.Input["image_url"] == prepared.Input["audio_url"] {
		t.Fatalf("KIE requires independent image and ElevenLabs audio URLs: %+v", prepared.Input)
	}
}

func TestTalkNeedsPictureVoiceAndAWholeLength(t *testing.T) {
	ok := map[string]any{"image_url": "https://files.example/a.png", "audio_media_id": picture, "prompt": "smiles", "seconds": float64(12)}
	if got, err := ParseTalk(ok); err != nil || got.Seconds != 12 || got.Audio.MediaID != picture {
		t.Fatalf("talk = %+v err = %v", got, err)
	}
	with := func(k string, v any) map[string]any {
		m := map[string]any{}
		for key, val := range ok {
			m[key] = val
		}
		if v == nil {
			delete(m, k)
		} else {
			m[k] = v
		}
		return m
	}
	for name, args := range map[string]map[string]any{
		"no picture":    with("image_url", nil),
		"no voice":      with("audio_media_id", nil),
		"both pictures": with("image_media_id", picture),
		"no seconds":    with("seconds", nil),
		"too long":      with("seconds", float64(MaxTalkSeconds+1)),
		"fractional":    with("seconds", 2.5),
		"no prompt":     with("prompt", nil),
	} {
		if _, err := ParseTalk(args); !errors.Is(err, ErrInvalid) {
			t.Errorf("%s: err = %v", name, err)
		}
	}
}

type files struct{ loaded []string }

func (f *files) Load(_ context.Context, _, id string, _ int64) ([]byte, string, error) {
	if id == "missing" {
		return nil, "", media.ErrNotFound
	}
	f.loaded = append(f.loaded, id)
	return []byte("data"), "image/png", nil
}

type fetcher struct{}

func (fetcher) Fetch(context.Context, string, int64) ([]byte, error) { return []byte("RIFF"), nil }

type uploader struct{ n int }

func (u *uploader) Upload(context.Context, string, string, []byte) (string, error) {
	u.n++
	return "https://kie.example/f" + string(rune('0'+u.n)), nil
}

func TestBuildersHostEveryInputAtKIEAndNeverTouchAVoice(t *testing.T) {
	up := &uploader{}
	b := Builder{Files: &files{}, Fetcher: fetcher{}, Uploader: up}
	job := jobs.Job{UserID: "u", Input: map[string]any{"image_url": "https://files.example/a.png", "audio_media_id": picture, "prompt": "calm", "seconds": float64(5)}}
	p, err := b.BuildTalk(context.Background(), job)
	if err != nil || p.Model != ModelTalk || p.Input["image_url"] == p.Input["audio_url"] || up.n != 2 {
		t.Fatalf("talk = %+v err = %v uploads = %d", p, err, up.n)
	}
	s, err := b.BuildSpeech(context.Background(), jobs.Job{Input: map[string]any{"text": "hello"}})
	if err != nil || s.Input["voice"] != DefaultVoice {
		t.Fatalf("speech = %+v err = %v", s, err)
	}
	e, err := b.BuildEdit(context.Background(), jobs.Job{UserID: "u", Input: map[string]any{"prompt": "x", "image_media_ids": []any{picture}}})
	if err != nil || e.Model != ModelEdit || len(e.Input["image_urls"].([]string)) != 1 {
		t.Fatalf("edit = %+v err = %v", e, err)
	}
}

func TestAMissingFileFailsTheJobWithAMessageForTheUser(t *testing.T) {
	b := Builder{Files: &files{}, Fetcher: fetcher{}, Uploader: &uploader{}}
	_, err := b.hosted(context.Background(), "u", source{MediaID: "missing"})
	var ue *transform.UserError
	if !errors.As(err, &ue) {
		t.Fatalf("err = %v", err)
	}
}

type model struct{ out string }

func (m model) GenerateJSON(context.Context, string, string, *genai.Schema) ([]byte, gemini.Usage, error) {
	return []byte(m.out), gemini.Usage{}, nil
}

func TestCheckerAcceptsOnlyAWellFormedReview(t *testing.T) {
	good, err := NewChecker(model{`{"verdict":"fix","issues":"Too long.","script":"Short."}`}).Check(context.Background(), "A long script")
	if err != nil || good.Verdict != VerdictFix || good.Script != "Short." {
		t.Fatalf("review = %+v err = %v", good, err)
	}
	for _, out := range []string{`{"verdict":"maybe","issues":"","script":"x"}`, `{"verdict":"good","issues":"","script":""}`, `nope`} {
		if _, err := NewChecker(model{out}).Check(context.Background(), "x"); err == nil {
			t.Errorf("%s was accepted", out)
		}
	}
}
