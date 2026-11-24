package assetlib

import (
	"context"
	"errors"
	"fmt"
	"testing"
)

type fakeGroups struct {
	groups   []Group
	assigned map[string]string
}

func (f *fakeGroups) ListGroups(context.Context, string) ([]Group, error) { return f.groups, nil }
func (f *fakeGroups) CreateGroup(_ context.Context, _, name string) (Group, error) {
	g := Group{ID: fmt.Sprint(len(f.groups) + 1), Name: name}
	f.groups = append(f.groups, g)
	return g, nil
}
func (f *fakeGroups) RenameGroup(_ context.Context, _, id, name string) (Group, error) {
	return Group{ID: id, Name: name}, nil
}
func (f *fakeGroups) DeleteGroup(context.Context, string, string) error { return nil }
func (f *fakeGroups) Assign(_ context.Context, _, assetID, groupID string) (Asset, error) {
	if f.assigned == nil {
		f.assigned = map[string]string{}
	}
	f.assigned[assetID] = groupID
	return Asset{ID: assetID}, nil
}

func TestGroupNamesAreTidiedAndBounded(t *testing.T) {
	g := &fakeGroups{}
	svc := NewService(nil, nil).WithGroups(g)
	got, err := svc.CreateGroup(context.Background(), "u1", "  Ada   Lovelace ")
	if err != nil || got.Name != "Ada Lovelace" {
		t.Fatalf("create: %+v %v", got, err)
	}
	for _, bad := range []string{"", "   ", string(make([]rune, maxGroupName+1))} {
		if _, err := svc.CreateGroup(context.Background(), "u1", bad); !errors.Is(err, ErrInvalid) {
			t.Fatalf("name %q: %v", bad, err)
		}
	}
	if _, err := svc.RenameGroup(context.Background(), "u1", "1", ""); !errors.Is(err, ErrInvalid) {
		t.Fatalf("empty rename: %v", err)
	}
}

func TestGroupsStopAtTheCap(t *testing.T) {
	g := &fakeGroups{}
	for i := range MaxGroups {
		g.groups = append(g.groups, Group{ID: fmt.Sprint(i)})
	}
	svc := NewService(nil, nil).WithGroups(g)
	if _, err := svc.CreateGroup(context.Background(), "u1", "One more"); !errors.Is(err, ErrTooManyGroups) {
		t.Fatalf("err = %v", err)
	}
}

func TestWithoutAGroupStoreNothingIsFiled(t *testing.T) {
	svc := NewService(nil, nil)
	if list, err := svc.ListGroups(context.Background(), "u1"); err != nil || len(list) != 0 {
		t.Fatalf("list: %v %v", list, err)
	}
	if _, err := svc.Assign(context.Background(), "u1", "a", "g"); !errors.Is(err, ErrGroupNotFound) {
		t.Fatalf("assign: %v", err)
	}
}
