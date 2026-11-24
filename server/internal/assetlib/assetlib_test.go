package assetlib

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/media"
)

type fakeMedia map[string]media.Kind

func (f fakeMedia) Resolve(_ context.Context, _ string, ids []string) ([]media.Item, error) {
	items := make([]media.Item, 0, len(ids))
	for _, id := range ids {
		kind, ok := f[id]
		if !ok {
			return nil, errors.New("not owned")
		}
		items = append(items, media.Item{ID: id, Kind: kind, MIME: mimeOf[id]})
	}
	return items, nil
}

func (f fakeMedia) ViewURL(_ context.Context, _, id string) (string, error) {
	return "https://cdn/" + id, nil
}

var mimeOf = map[string]string{"img": "image/png", "mp3": "audio/mpeg", "mp4": "video/mp4", "webp": "image/webp", "weba": "audio/webm"}

type fakeRepo struct{ assets map[string]Asset }

func (f *fakeRepo) List(_ context.Context, userID string) ([]Asset, error) {
	var out []Asset
	for _, a := range f.assets {
		if a.UserID == userID {
			out = append(out, a)
		}
	}
	return out, nil
}

func (f *fakeRepo) Get(_ context.Context, userID, id string) (Asset, error) {
	a, ok := f.assets[id]
	if !ok || a.UserID != userID {
		return Asset{}, ErrNotFound
	}
	return a, nil
}

func (f *fakeRepo) Create(_ context.Context, a Asset) (Asset, error) {
	a.ID = "asset-" + a.Label
	f.assets[a.ID] = a
	return a, nil
}

func (f *fakeRepo) Relabel(ctx context.Context, userID, id, label string) (Asset, error) {
	a, err := f.Get(ctx, userID, id)
	a.Label = label
	return a, err
}

func (f *fakeRepo) Consent(ctx context.Context, userID, id string) (Asset, error) {
	a, err := f.Get(ctx, userID, id)
	now := time.Now()
	a.ConsentAt = &now
	if err == nil {
		f.assets[id] = a
	}
	return a, err
}

func (f *fakeRepo) Delete(_ context.Context, _, id string) error { delete(f.assets, id); return nil }

func newTestService() *Service {
	return NewService(&fakeRepo{assets: map[string]Asset{}}, fakeMedia{"img": media.KindImage, "mp3": media.KindAudio, "mp4": media.KindVideo, "webp": media.KindImage, "weba": media.KindAudio})
}

func TestCreateMatchesTheFileToTheKind(t *testing.T) {
	s := newTestService()
	ctx := t.Context()
	for _, ok := range []struct {
		kind  Kind
		media string
	}{{KindFace, "img"}, {KindVoice, "mp3"}, {KindProduct, "mp4"}, {KindEnvironment, "img"}, {KindMusic, "mp3"}, {KindOther, "mp3"}} {
		if _, err := s.Create(ctx, "u", ok.kind, "  My   "+string(ok.kind)+" ", ok.media); err != nil {
			t.Errorf("%s from %s: %v", ok.kind, ok.media, err)
		}
	}
	for _, bad := range []struct {
		kind  Kind
		media string
	}{{KindFace, "mp4"}, {KindVoice, "img"}, {KindMusic, "img"}, {KindProduct, "mp3"}, {KindFace, "someone-elses"}, {KindFace, "webp"}, {KindVoice, "weba"}} {
		if _, err := s.Create(ctx, "u", bad.kind, "Label", bad.media); !errors.Is(err, ErrMediaNotUsable) {
			t.Errorf("%s from %s was accepted: %v", bad.kind, bad.media, err)
		}
	}
	if _, err := s.Create(ctx, "u", "mood", "Label", "img"); !errors.Is(err, ErrInvalid) {
		t.Errorf("unknown kind: %v", err)
	}
}

func TestLabelsAreTidiedAndBounded(t *testing.T) {
	s := newTestService()
	a, err := s.Create(t.Context(), "u", KindFace, "  Ada \n  front  ", "img")
	if err != nil || a.Label != "Ada front" {
		t.Fatalf("label: %q %v", a.Label, err)
	}
	for _, bad := range []string{"", "   ", string(make([]rune, 61))} {
		if _, err := s.Relabel(t.Context(), "u", a.ID, bad); !errors.Is(err, ErrInvalid) {
			t.Errorf("label %q accepted", bad)
		}
	}
}

func TestOnlyFacesAndVoicesTakeConsent(t *testing.T) {
	s := newTestService()
	ctx := t.Context()
	face, _ := s.Create(ctx, "u", KindFace, "Face", "img")
	product, _ := s.Create(ctx, "u", KindProduct, "Bottle", "img")
	if got, err := s.Consent(ctx, "u", face.ID); err != nil || got.ConsentAt == nil {
		t.Fatalf("face consent: %+v %v", got, err)
	}
	if _, err := s.Consent(ctx, "u", product.ID); !errors.Is(err, ErrInvalid) {
		t.Fatalf("product consent: %v", err)
	}
	if _, err := s.Consent(ctx, "someone-else", face.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("another user's asset: %v", err)
	}
}

func TestListAddsDisplayLinks(t *testing.T) {
	s := newTestService()
	if _, err := s.Create(t.Context(), "u", KindVoice, "Narrator", "mp3"); err != nil {
		t.Fatal(err)
	}
	list, err := s.List(t.Context(), "u")
	if err != nil || len(list) != 1 || list[0].URL != "https://cdn/mp3" {
		t.Fatalf("list: %+v %v", list, err)
	}
}

func TestOnlyConsentedAssetsOfTheRightKindAreUsable(t *testing.T) {
	s := newTestService()
	ctx := t.Context()
	voice, _ := s.Create(ctx, "u", KindVoice, "Narrator", "mp3")
	if _, err := s.Usable(ctx, "u", voice.ID, KindVoice); !errors.Is(err, ErrInvalid) {
		t.Fatalf("an unconsented voice is not usable: %v", err)
	}
	if _, err := s.Consent(ctx, "u", voice.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Usable(ctx, "u", voice.ID, KindVoice); err != nil {
		t.Fatalf("a consented voice is usable: %v", err)
	}
	if _, err := s.Usable(ctx, "u", voice.ID, KindFace); !errors.Is(err, ErrInvalid) {
		t.Fatalf("a voice is not a face: %v", err)
	}
	product, _ := s.Create(ctx, "u", KindProduct, "Bottle", "img")
	if _, err := s.Usable(ctx, "u", product.ID, KindProduct); err != nil {
		t.Fatalf("products need no consent: %v", err)
	}
	if _, err := s.Usable(ctx, "other", product.ID, KindProduct); !errors.Is(err, ErrNotFound) {
		t.Fatalf("another user's asset: %v", err)
	}
}

// batchMedia signs in batches and counts them; it refuses one-by-one signing.
type batchMedia struct {
	fakeMedia
	batches []int
}

func (b *batchMedia) ViewURL(context.Context, string, string) (string, error) {
	return "", errors.New("one at a time is too slow")
}

func (b *batchMedia) ViewLinks(_ context.Context, _ string, ids []string) map[string]media.Link {
	b.batches = append(b.batches, len(ids))
	out := map[string]media.Link{}
	for _, id := range ids {
		out[id] = media.Link{URL: "https://cdn/" + id}
	}
	return out
}

func TestListSignsEveryFileInBatches(t *testing.T) {
	repo := &fakeRepo{assets: map[string]Asset{}}
	for i := range media.MaxLinks + 20 {
		id := fmt.Sprintf("a%d", i)
		repo.assets[id] = Asset{ID: id, UserID: "u1", MediaID: "m" + id}
	}
	m := &batchMedia{}
	list, err := NewService(repo, m).List(context.Background(), "u1")
	if err != nil {
		t.Fatal(err)
	}
	if len(m.batches) != 2 || m.batches[0] != media.MaxLinks || m.batches[1] != 20 {
		t.Fatalf("batches = %v", m.batches)
	}
	for _, a := range list {
		if a.URL != "https://cdn/"+a.MediaID {
			t.Fatalf("asset %s has no link", a.ID)
		}
	}
}
