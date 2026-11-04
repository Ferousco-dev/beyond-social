package chat

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
)

type fakeFiles struct {
	items map[string]media.Item
	loads int
}

func (f *fakeFiles) Resolve(_ context.Context, user string, ids []string) ([]media.Item, error) {
	var out []media.Item
	for _, id := range ids {
		item, ok := f.items[id]
		if !ok || item.UserID != user {
			return nil, media.ErrNotFound
		}
		out = append(out, item)
	}
	return out, nil
}
func (f *fakeFiles) Load(_ context.Context, _, id string, _ int64) ([]byte, string, error) {
	f.loads++
	return []byte("data-" + id), f.items[id].MIME, nil
}

func files() *fakeFiles {
	return &fakeFiles{items: map[string]media.Item{
		"img": {ID: "img", UserID: "u1", Kind: media.KindImage, Name: "shoe.png", MIME: "image/png", Size: 100, Ready: true},
		"aud": {ID: "aud", UserID: "u1", Kind: media.KindAudio, Name: "note.webm", MIME: "audio/webm", Size: 100, Ready: true},
		"vid": {ID: "vid", UserID: "u1", Kind: media.KindVideo, Name: "clip.mp4", MIME: "video/mp4", Size: 100, Ready: true},
		"big": {ID: "big", UserID: "u1", Kind: media.KindImage, Name: "huge.png", MIME: "image/png", Size: maxInlineBytes + 1, Ready: true},
		"foe": {ID: "foe", UserID: "u2", Kind: media.KindImage, Name: "theirs.png", MIME: "image/png", Size: 100, Ready: true},
	}}
}

type seeRouter struct {
	files []gemini.Media
	last  []Turn
}

func (r *seeRouter) Route(_ context.Context, in RouteInput) (Decision, error) {
	r.files, r.last = in.Files, in.History
	return Decision{Reply: "I see it"}, nil
}

func TestPicturesAndVoiceNotesReachTheModelEvenWithoutText(t *testing.T) {
	store, r := newMem(), &seeRouter{}
	svc := NewService(store, r, &stubPlanner{}).WithAttachments(files())
	ex, err := svc.Send(context.Background(), "u1", "c1", "", "", []string{"img", "aud"}, "")
	if err != nil {
		t.Fatal(err)
	}
	if len(r.files) != 2 || r.files[0].MIME != "image/png" || r.files[1].MIME != "audio/webm" {
		t.Fatalf("model was given %+v", r.files)
	}
	if !strings.HasPrefix(ex.User.Content, "Attached: image shoe.png") || len(ex.User.Attachments) != 2 {
		t.Fatalf("message = %+v", ex.User)
	}
}

func TestEarlierAttachmentsAreMentionedToTheModel(t *testing.T) {
	store, r := newMem(), &seeRouter{}
	svc := NewService(store, r, &stubPlanner{}).WithAttachments(files())
	if _, err := svc.Send(context.Background(), "u1", "c1", "look", "", []string{"img"}, ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Send(context.Background(), "u1", "c1", "and now?", "", nil, ""); err != nil {
		t.Fatal(err)
	}
	if len(r.last) == 0 || !strings.Contains(r.last[0].Content, `[attached: image "shoe.png"]`) {
		t.Fatalf("history = %+v", r.last)
	}
}

func TestAnUploadedVideoStartsAnAnalysis(t *testing.T) {
	store, an := newMem(), &stubAnalyzer{}
	router := &stubRouter{decision: Decision{Reply: "unused"}}
	svc := NewService(store, router, &stubPlanner{}).WithAttachments(files()).WithAnalyzer(an)
	ex, err := svc.Send(context.Background(), "u1", "c1", "what is this", "", []string{"vid"}, "")
	if err != nil || an.mediaID != "vid" || router.calls != 0 || ex.Assistant.JobID != "job-1" {
		t.Fatalf("mediaID=%q calls=%d ex=%+v err=%v", an.mediaID, router.calls, ex, err)
	}
}

func TestAttachmentProblemsAreRefusedBeforeAnythingIsSaved(t *testing.T) {
	for name, tc := range map[string]struct {
		ids  []string
		want error
	}{
		"someone else's file": {[]string{"foe"}, media.ErrNotFound},
		"too much to read":    {[]string{"big"}, media.ErrTooLarge},
	} {
		t.Run(name, func(t *testing.T) {
			store := newMem()
			svc := NewService(store, &seeRouter{}, &stubPlanner{}).WithAttachments(files())
			if _, err := svc.Send(context.Background(), "u1", "c1", "hi", "", tc.ids, ""); !errors.Is(err, tc.want) {
				t.Fatalf("err = %v, want %v", err, tc.want)
			}
		})
	}
	// Attachments need the feature switched on.
	if _, err := newMemService().Send(context.Background(), "u1", "c1", "hi", "", []string{"img"}, ""); !errors.Is(err, ErrInvalid) {
		t.Fatalf("without attachments enabled: %v", err)
	}
}

func newMemService() *Service { return NewService(newMem(), &stubRouter{}, &stubPlanner{}) }
