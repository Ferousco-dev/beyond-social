package kietools

import (
	"context"
	"encoding/binary"
	"errors"
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/Ferousco-dev/beyond-social/server/internal/transform"
	"google.golang.org/genai"
)

const picture = "10000000-0000-4000-8000-000000000001"

func TestLiveAvatarLipSyncsTheFaceToTheVoiceRecordingAsItIs(t *testing.T) {
	up := &uploader{}
	b := LiveAvatarBuilder{Builder: Builder{Files: &files{}, Fetcher: fetcher{}, Uploader: up}}
	prepared, err := b.BuildLiveAvatar(context.Background(), jobs.Job{UserID: "u", Input: map[string]any{
		"face_media_id": picture, "voice_media_id": "00000000-0000-4000-8000-000000000002", "script": "Hello there", "prompt": "Calm direct-to-camera delivery.",
	}})
	if err != nil || prepared.Model != ModelTalk || up.n != 2 {
		t.Fatalf("prepared=%+v err=%v uploads=%d", prepared, err, up.n)
	}
	if prepared.Input["image_url"] == prepared.Input["audio_url"] {
		t.Fatalf("KIE requires independent image and voice audio URLs: %+v", prepared.Input)
	}
	if _, err := b.BuildLiveAvatar(context.Background(), jobs.Job{UserID: "u", Input: map[string]any{"face_media_id": picture}}); err == nil {
		t.Fatal("a job without a voice recording must not reach KIE")
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

func TestTalkPromptKeepsThePersonsWordsFirstAndAddsTheRealLook(t *testing.T) {
	if got := talkPrompt("  Smile warmly.  "); !strings.HasPrefix(got, "Smile warmly. ") || !strings.HasSuffix(got, realLook) {
		t.Fatalf("got %q", got)
	}
	if got := talkPrompt(""); got != realLook {
		t.Fatalf("empty direction: %q", got)
	}
	if n := utf8.RuneCountInString(talkPrompt(strings.Repeat("x", MaxPromptRunes))); n > 5000 {
		t.Fatalf("prompt is %d characters, the model takes 5000", n)
	}
}

// wavFile is a silent mono 8 kHz 8-bit WAV that plays for the given seconds.
func wavFile(seconds int) []byte {
	const rate = 8000
	n := rate * seconds
	h := make([]byte, 44)
	copy(h[0:], "RIFF")
	binary.LittleEndian.PutUint32(h[4:], uint32(36+n))
	copy(h[8:], "WAVEfmt ")
	binary.LittleEndian.PutUint32(h[16:], 16)
	binary.LittleEndian.PutUint16(h[20:], 1)
	binary.LittleEndian.PutUint16(h[22:], 1)
	binary.LittleEndian.PutUint32(h[24:], rate)
	binary.LittleEndian.PutUint32(h[28:], rate)
	binary.LittleEndian.PutUint16(h[32:], 1)
	binary.LittleEndian.PutUint16(h[34:], 8)
	copy(h[36:], "data")
	binary.LittleEndian.PutUint32(h[40:], uint32(n))
	return append(h, make([]byte, n)...)
}

const voiceID = "3c7d2e1f-6a5b-4c3d-8e9f-0a1b2c3d4e5f"

type talkFiles struct{ seconds int }

func (r talkFiles) Load(_ context.Context, _, id string, _ int64) ([]byte, string, error) {
	if id == voiceID {
		return wavFile(r.seconds), "audio/wav", nil
	}
	return []byte("data"), "image/png", nil
}

func TestATalkingPhotoLongerThanWhatWasChargedIsRefused(t *testing.T) {
	job := func(seconds float64) jobs.Job {
		return jobs.Job{UserID: "u", Input: map[string]any{"image_media_id": picture, "audio_media_id": voiceID, "prompt": "calm", "seconds": seconds}}
	}
	up := &uploader{}
	b := Builder{Files: talkFiles{seconds: 30}, Fetcher: fetcher{}, Uploader: up}
	_, err := b.BuildTalk(context.Background(), job(5))
	var ue *transform.UserError
	if !errors.As(err, &ue) {
		t.Fatalf("a 30 s recording charged as 5 s was accepted: %v", err)
	}
	if up.n != 1 {
		t.Fatalf("the recording must not reach the provider; uploads = %d", up.n)
	}
	if _, err := b.BuildTalk(context.Background(), job(30)); err != nil {
		t.Fatalf("a recording charged at its own length was refused: %v", err)
	}
}

func TestATalkingAvatarIsNeverToldToLookCinematicOrMoveToAStudio(t *testing.T) {
	got := talkPrompt("Warm delivery, speaking straight to camera. steady framing, head and shoulders. Cinematic. Setting: Studio")
	if strings.Contains(got, ". Cinematic") || strings.Contains(got, "Setting: Studio") {
		t.Fatalf("the avatar was sent the raw look or a setting that fights its photo: %s", got)
	}
	if !strings.HasPrefix(got, "Warm delivery, speaking straight to camera") || !strings.HasSuffix(got, realLook) {
		t.Fatalf("the delivery must stay first and the real look last: %s", got)
	}
}
