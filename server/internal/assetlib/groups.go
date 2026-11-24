package assetlib

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	maxGroupName = 40
	// MaxGroups keeps the picker short enough to scan.
	MaxGroups = 50
)

var (
	ErrGroupNotFound  = errors.New("group not found")
	ErrGroupNameTaken = errors.New("you already have a group with that name")
	ErrTooManyGroups  = errors.New("too many groups")
)

// Group is a named set of library assets, such as one person or one product.
type Group struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

// GroupStore persists groups and which group each asset is in. Every method
// is scoped to the user, so a group or asset of someone else reads as not found.
type GroupStore interface {
	ListGroups(ctx context.Context, userID string) ([]Group, error)
	CreateGroup(ctx context.Context, userID, name string) (Group, error)
	RenameGroup(ctx context.Context, userID, id, name string) (Group, error)
	DeleteGroup(ctx context.Context, userID, id string) error
	// Assign puts an asset in a group, or takes it out of any when groupID is empty.
	Assign(ctx context.Context, userID, assetID, groupID string) (Asset, error)
}

// WithGroups lets the service file assets into groups.
func (s *Service) WithGroups(g GroupStore) *Service {
	s.groups = g
	return s
}

func (s *Service) ListGroups(ctx context.Context, userID string) ([]Group, error) {
	if s.groups == nil {
		return []Group{}, nil
	}
	return s.groups.ListGroups(ctx, userID)
}

func (s *Service) CreateGroup(ctx context.Context, userID, name string) (Group, error) {
	if s.groups == nil {
		return Group{}, fmt.Errorf("%w: groups are not available", ErrInvalid)
	}
	name, err := cleanGroupName(name)
	if err != nil {
		return Group{}, err
	}
	existing, err := s.groups.ListGroups(ctx, userID)
	if err != nil {
		return Group{}, err
	}
	if len(existing) >= MaxGroups {
		return Group{}, fmt.Errorf("%w: you can have up to %d groups", ErrTooManyGroups, MaxGroups)
	}
	return s.groups.CreateGroup(ctx, userID, name)
}

func (s *Service) RenameGroup(ctx context.Context, userID, id, name string) (Group, error) {
	if s.groups == nil {
		return Group{}, ErrGroupNotFound
	}
	name, err := cleanGroupName(name)
	if err != nil {
		return Group{}, err
	}
	return s.groups.RenameGroup(ctx, userID, id, name)
}

// DeleteGroup removes the group only; its assets stay in the library, ungrouped.
func (s *Service) DeleteGroup(ctx context.Context, userID, id string) error {
	if s.groups == nil {
		return ErrGroupNotFound
	}
	return s.groups.DeleteGroup(ctx, userID, id)
}

// Assign files an asset into one of the person's groups, or out of any.
func (s *Service) Assign(ctx context.Context, userID, assetID, groupID string) (Asset, error) {
	if s.groups == nil {
		return Asset{}, ErrGroupNotFound
	}
	return s.groups.Assign(ctx, userID, assetID, strings.TrimSpace(groupID))
}

func cleanGroupName(name string) (string, error) {
	name = strings.Join(strings.Fields(name), " ")
	if name == "" || utf8.RuneCountInString(name) > maxGroupName {
		return "", fmt.Errorf("%w: group names run 1 to %d characters", ErrInvalid, maxGroupName)
	}
	return name, nil
}
