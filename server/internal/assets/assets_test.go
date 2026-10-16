package assets

import (
	"context"
	"errors"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/media"
)

type fakeRepo struct {
	groups map[string]Group
}

func newFakeRepo() *fakeRepo { return &fakeRepo{groups: make(map[string]Group)} }

func (f *fakeRepo) List(_ context.Context, userID string) ([]Group, error) {
	var out []Group
	for _, group := range f.groups {
		if group.UserID == userID {
			out = append(out, group)
		}
	}
	return out, nil
}

func (f *fakeRepo) Count(_ context.Context, userID string) (int, error) {
	n := 0
	for _, group := range f.groups {
		if group.UserID == userID {
			n++
		}
	}
	return n, nil
}

func (f *fakeRepo) Get(_ context.Context, userID, id string) (Group, error) {
	group, ok := f.groups[id]
	if !ok || group.UserID != userID {
		return Group{}, ErrNotFound
	}
	return group, nil
}

func (f *fakeRepo) Create(_ context.Context, userID, name string) (Group, error) {
	for _, group := range f.groups {
		if group.UserID == userID && group.Name == name {
			return Group{}, ErrNameTaken
		}
	}
	group := Group{ID: "g-" + name, UserID: userID, Name: name, Extras: []Extra{}}
	f.groups[group.ID] = group
	return group, nil
}

func (f *fakeRepo) Update(_ context.Context, userID, id, name string, slots Slots, extras []Extra) (Group, error) {
	group, ok := f.groups[id]
	if !ok || group.UserID != userID {
		return Group{}, ErrNotFound
	}
	for _, other := range f.groups {
		if other.ID != id && other.UserID == userID && other.Name == name {
			return Group{}, ErrNameTaken
		}
	}
	group.Name, group.Slots, group.Extras = name, slots, extras
	f.groups[id] = group
	return group, nil
}

func (f *fakeRepo) Delete(_ context.Context, userID, id string) error {
	group, ok := f.groups[id]
	if !ok || group.UserID != userID {
		return ErrNotFound
	}
	delete(f.groups, id)
	return nil
}

func (f *fakeRepo) Consent(_ context.Context, userID, id, _ string) (Group, error) {
	group, ok := f.groups[id]
	if !ok || group.UserID != userID {
		return Group{}, ErrNotFound
	}
	return group, nil
}

type fakeMedia struct {
	kinds map[string]media.Kind
}

func (f fakeMedia) Resolve(_ context.Context, userID string, ids []string) ([]media.Item, error) {
	var out []media.Item
	for _, id := range ids {
		kind, ok := f.kinds[id]
		if !ok {
			return nil, errors.New("no such file")
		}
		out = append(out, media.Item{ID: id, UserID: userID, Kind: kind})
	}
	return out, nil
}

func (f fakeMedia) ViewURL(_ context.Context, _, id string) (string, error) {
	return "https://files.example/" + id, nil
}

func TestCreateAutoNamesAndCountsUp(t *testing.T) {
	service := NewService(newFakeRepo(), fakeMedia{})
	first, err := service.Create(context.Background(), "u1", "")
	if err != nil || first.Name != "avatar001" {
		t.Fatalf("first = %+v err=%v", first, err)
	}
	second, err := service.Create(context.Background(), "u1", "")
	if err != nil || second.Name != "avatar002" {
		t.Fatalf("second = %+v err=%v", second, err)
	}
	blank, err := service.Create(context.Background(), "u1", "  ")
	if err != nil || blank.Name != "avatar003" {
		t.Fatalf("blank names auto-fill: %+v err=%v", blank, err)
	}
	custom, err := service.Create(context.Background(), "u1", "Summer launch")
	if err != nil || custom.Name != "Summer launch" {
		t.Fatalf("custom = %+v err=%v", custom, err)
	}
}

func TestSetValidatesSlotKinds(t *testing.T) {
	media := fakeMedia{kinds: map[string]media.Kind{"pic": media.KindImage, "clip": media.KindVideo, "line": media.KindAudio}}
	service := NewService(newFakeRepo(), media)
	group, _ := service.Create(context.Background(), "u1", "")

	_, err := service.Set(context.Background(), "u1", group.ID,
		Slots{Face: "pic", Voice: "line", Product: "clip", Environment: "pic"},
		[]Extra{{ID: "pic", Label: "Alt angle"}})
	if err != nil {
		t.Fatalf("valid set: %v", err)
	}
	if _, err := service.Set(context.Background(), "u1", group.ID, Slots{Voice: "pic"}, nil); err == nil {
		t.Fatal("a picture is not a voice")
	}
	if _, err := service.Set(context.Background(), "u1", group.ID, Slots{}, []Extra{{ID: "pic", Label: "  "}}); err == nil {
		t.Fatal("extras need labels")
	}
	if _, err := service.Set(context.Background(), "u1", group.ID, Slots{Face: "ghost"}, nil); err == nil {
		t.Fatal("foreign files must fail the whole update")
	}
	if _, err := service.Set(context.Background(), "u2", group.ID, Slots{}, nil); err == nil {
		t.Fatal("another user's group is invisible")
	}
}

func TestConsentCoversFaceOrVoice(t *testing.T) {
	service := NewService(newFakeRepo(), fakeMedia{})
	group, _ := service.Create(context.Background(), "u1", "")
	if _, err := service.Consent(context.Background(), "u1", group.ID, "face"); err != nil {
		t.Fatalf("consent: %v", err)
	}
	if _, err := service.Consent(context.Background(), "u1", group.ID, "mood"); err == nil {
		t.Fatal("consent covers face or voice only")
	}
}
