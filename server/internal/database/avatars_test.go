package database

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/avatars"
	"github.com/google/uuid"
)

func newAvatar(t *testing.T, s *AvatarStore, user string, key string) avatars.Avatar {
	t.Helper()
	a, isNew, err := s.Create(context.Background(), avatars.NewAvatar{
		UserID: user, Name: "Sarah", StoragePath: user + "/twin-" + uuid.NewString() + ".mp4", ConsentVersion: 1, IdempotencyKey: key,
	})
	if err != nil || !isNew {
		t.Fatalf("create: %v new=%v", err, isNew)
	}
	return a
}

func sp(s string) *string { return &s }

func TestAvatarCreateIdempotentAndDefault(t *testing.T) {
	s := NewAvatarStore(testPool(t))
	alice, bob := uuid.NewString(), uuid.NewString()

	first := newAvatar(t, s, alice, "k1")
	if first.TrainingStatus != "pending" || first.UserID != alice || !first.IsDefault || first.StoragePath == "" {
		t.Fatalf("unexpected %+v", first)
	}
	if second := newAvatar(t, s, alice, ""); second.IsDefault {
		t.Fatal("only the first avatar becomes the default")
	}
	again, isNew, err := s.Create(context.Background(), avatars.NewAvatar{UserID: alice, Name: "x", StoragePath: "p", ConsentVersion: 1, IdempotencyKey: "k1"})
	if err != nil || isNew || again.ID != first.ID {
		t.Fatalf("a repeated key must return the original: %+v new=%v %v", again, isNew, err)
	}
	if other := newAvatar(t, s, bob, "k1"); other.ID == first.ID {
		t.Fatal("keys are per user")
	}
}

func TestAvatarLimit(t *testing.T) {
	s := NewAvatarStore(testPool(t))
	user := uuid.NewString()
	for range 5 {
		newAvatar(t, s, user, "")
	}
	_, _, err := s.Create(context.Background(), avatars.NewAvatar{UserID: user, Name: "x", StoragePath: "p", ConsentVersion: 1})
	if !errors.Is(err, avatars.ErrLimitReached) {
		t.Fatalf("expected ErrLimitReached, got %v", err)
	}
}

func TestAvatarOwnership(t *testing.T) {
	s := NewAvatarStore(testPool(t))
	ctx := context.Background()
	alice, mallory := uuid.NewString(), uuid.NewString()
	a := newAvatar(t, s, alice, "")

	for name, id := range map[string]string{"foreign": a.ID, "missing": uuid.NewString(), "malformed": "nope"} {
		if _, err := s.Get(ctx, mallory, id); !errors.Is(err, avatars.ErrNotFound) {
			t.Errorf("%s get: expected ErrNotFound, got %v", name, err)
		}
	}
	if list, _ := s.List(ctx, mallory, 10, 0); len(list) != 0 {
		t.Fatalf("listed a foreign avatar: %+v", list)
	}
	if n, _ := s.CountPending(ctx, mallory); n != 0 {
		t.Fatalf("pending count leaked: %d", n)
	}
	if _, err := s.SelectVoice(ctx, mallory, a.ID, "v"); !errors.Is(err, avatars.ErrNotFound) {
		t.Fatalf("foreign voice selection: %v", err)
	}
	if _, err := s.SelectVoice(ctx, alice, a.ID, "v"); !errors.Is(err, avatars.ErrNotReady) {
		t.Fatalf("a pending avatar cannot be given a voice: %v", err)
	}
}

func TestAvatarAdvanceLifecycle(t *testing.T) {
	s := NewAvatarStore(testPool(t))
	ctx := context.Background()
	user := uuid.NewString()
	a := newAvatar(t, s, user, "")

	marked, err := s.Advance(ctx, a.ID, avatars.Update{MarkSubmitting: true})
	if err != nil || marked.SubmitStartedAt == nil {
		t.Fatalf("mark submitting: %+v %v", marked, err)
	}
	expires := time.Now().Add(23 * time.Hour).UTC()
	got, err := s.Advance(ctx, a.ID, avatars.Update{
		GroupID: sp("group-1"), LookID: sp("look-1"), TwinVoiceID: sp("voice-1"), ConsentStatus: sp("pending"),
		ConsentURL: sp("https://consent/x"), ConsentExpires: &expires, PollDelta: 1,
	})
	if err != nil || got.GroupID != "group-1" || got.LookID != "look-1" || got.TwinVoiceID != "voice-1" || got.ConsentURL != "https://consent/x" ||
		got.ConsentExpiresAt == nil || got.PollCount != 1 || got.TrainingStatus != "pending" {
		t.Fatalf("provider ids: %+v %v", got, err)
	}
	again, _ := s.Advance(ctx, a.ID, avatars.Update{MarkSubmitting: true})
	if again.SubmitStartedAt == nil || !again.SubmitStartedAt.Equal(*marked.SubmitStartedAt) {
		t.Fatalf("marking again must keep the original time: the replay window runs from the first attempt (%v vs %v)", again.SubmitStartedAt, marked.SubmitStartedAt)
	}

	ready, err := s.Advance(ctx, a.ID, avatars.Update{
		TrainingStatus: "ready", TwinVoiceID: sp("voice-1"), SelectedVoiceID: sp("voice-1"), ConsentURL: sp(""),
		PreviewImage: sp("https://p/i.png"), MarkTrained: true,
	})
	if err != nil || ready.TrainingStatus != "ready" || ready.VoiceID != "voice-1" || ready.ConsentURL != "" || ready.TrainedAt == nil || ready.PreviewImageURL == "" {
		t.Fatalf("ready: %+v %v", ready, err)
	}

	// A finished avatar rejects further updates, so late or repeated work is harmless.
	if _, err := s.Advance(ctx, a.ID, avatars.Update{TrainingStatus: "failed", Error: "late"}); !errors.Is(err, avatars.ErrFinished) {
		t.Fatalf("expected ErrFinished, got %v", err)
	}
	if got, _ := s.Get(ctx, user, a.ID); got.TrainingStatus != "ready" || got.Error != "" {
		t.Fatalf("a rejected update changed the row: %+v", got)
	}
}

func TestSelectedVoiceIsNotOverwrittenByTheDefault(t *testing.T) {
	s := NewAvatarStore(testPool(t))
	ctx := context.Background()
	user := uuid.NewString()
	a := newAvatar(t, s, user, "")
	if _, err := s.pool.Exec(ctx, `update public.avatars set selected_voice_id = 'chosen' where id = $1`, a.ID); err != nil {
		t.Fatal(err)
	}
	ready, _ := s.Advance(ctx, a.ID, avatars.Update{TrainingStatus: "ready", SelectedVoiceID: sp("cloned")})
	if ready.VoiceID != "chosen" {
		t.Fatalf("the owner's choice must win over the default, got %q", ready.VoiceID)
	}
	chosen, err := s.SelectVoice(ctx, user, a.ID, "lib-voice")
	if err != nil || chosen.VoiceID != "lib-voice" {
		t.Fatalf("select on a ready avatar: %+v %v", chosen, err)
	}
}

func TestAvatarClaimLeaseAndCleanup(t *testing.T) {
	s := NewAvatarStore(testPool(t))
	ctx := context.Background()
	a := newAvatar(t, s, uuid.NewString(), "")

	claimed, err := s.Claim(ctx, 5, time.Minute)
	if err != nil || len(claimed) != 1 || claimed[0].ID != a.ID {
		t.Fatalf("claim: %+v %v", claimed, err)
	}
	if again, _ := s.Claim(ctx, 5, time.Minute); len(again) != 0 {
		t.Fatal("a leased avatar must not be claimed twice")
	}

	now := time.Now()
	failed, err := s.Advance(ctx, a.ID, avatars.Update{TrainingStatus: "failed", Error: "nope", NextRun: &now})
	if err != nil || failed.TrainingStatus != "failed" || failed.Error != "nope" {
		t.Fatalf("fail: %+v %v", failed, err)
	}
	cleanup, _ := s.Claim(ctx, 5, time.Minute)
	if len(cleanup) != 1 || cleanup[0].FootageDeleted || cleanup[0].StoragePath == "" {
		t.Fatalf("a finished avatar with a recording is claimed for cleanup: %+v", cleanup)
	}

	retry := time.Now().Add(-time.Second)
	if err := s.FootageGone(ctx, a.ID, &retry); err != nil {
		t.Fatal(err)
	}
	if again, _ := s.Claim(ctx, 5, time.Minute); len(again) != 1 || again[0].StoragePath == "" {
		t.Fatalf("a failed deletion must be retried with the path kept: %+v", again)
	}
	if err := s.FootageGone(ctx, a.ID, nil); err != nil {
		t.Fatal(err)
	}
	done, _ := s.Get(ctx, a.UserID, a.ID)
	if !done.FootageDeleted || done.StoragePath != "" {
		t.Fatalf("recording should be recorded as deleted: %+v", done)
	}
	if again, _ := s.Claim(ctx, 5, time.Minute); len(again) != 0 {
		t.Fatal("a cleaned-up avatar leaves the schedule")
	}
}

func TestVoiceOwnership(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	s := NewAvatarStore(pool)
	records := NewVoiceRecords(pool)
	alice, bob := uuid.NewString(), uuid.NewString()

	a := newAvatar(t, s, alice, "")
	_, _ = s.Advance(ctx, a.ID, avatars.Update{TrainingStatus: "ready", TwinVoiceID: sp("alice-twin-voice")})
	b := newAvatar(t, s, bob, "")
	_, _ = s.Advance(ctx, b.ID, avatars.Update{TrainingStatus: "ready", TwinVoiceID: sp("bob-clone")})
	unfinished := newAvatar(t, s, alice, "")
	_, _ = s.Advance(ctx, unfinished.ID, avatars.Update{TwinVoiceID: sp("unfinished")})

	own, other, err := records.Ownership(ctx, alice, "alice-twin-voice")
	if err != nil || !own || other {
		t.Fatalf("alice's own voice: own=%v other=%v %v", own, other, err)
	}
	own, other, _ = records.Ownership(ctx, alice, "bob-clone")
	if own || !other {
		t.Fatalf("bob's voice must read as someone else's: own=%v other=%v", own, other)
	}
	if own, other, _ = records.Ownership(ctx, alice, "unknown"); own || other {
		t.Fatal("an unrecorded voice is nobody's")
	}

	list, err := records.OwnVoices(ctx, alice)
	if err != nil || len(list) != 1 || list[0].ID != "alice-twin-voice" {
		t.Fatalf("only usable voices owned by alice: %+v %v", list, err)
	}
	if list, _ := records.OwnVoices(ctx, bob); len(list) != 1 || list[0].ID != "bob-clone" {
		t.Fatalf("bob's list: %+v", list)
	}

	// ElevenLabs clones join the same ownership answers.
	if err := records.SaveClone(ctx, alice, "eleven-1", "Feranmi"); err != nil {
		t.Fatalf("save clone: %v", err)
	}
	if own, other, _ := records.Ownership(ctx, alice, "eleven-1"); !own || other {
		t.Fatalf("cloned voice must be alice's: own=%v other=%v", own, other)
	}
	if own, other, _ := records.Ownership(ctx, bob, "eleven-1"); own || !other {
		t.Fatalf("cloned voice must read as someone else's for bob: own=%v other=%v", own, other)
	}
	if list, _ := records.OwnVoices(ctx, alice); len(list) != 2 {
		t.Fatalf("clones join the voice list: %+v", list)
	}
}

func TestDeleteReassignsDefaultAndIsOwnerScoped(t *testing.T) {
	s := NewAvatarStore(testPool(t))
	ctx := context.Background()
	alice, mallory := uuid.NewString(), uuid.NewString()
	first := newAvatar(t, s, alice, "") // becomes the default
	second := newAvatar(t, s, alice, "")
	_, _ = s.Advance(ctx, second.ID, avatars.Update{TrainingStatus: "ready"})

	if ok, err := s.Delete(ctx, mallory, first.ID); err != nil || ok {
		t.Fatalf("a foreign delete must remove nothing: ok=%v %v", ok, err)
	}
	if ok, err := s.Delete(ctx, alice, first.ID); err != nil || !ok {
		t.Fatalf("delete: ok=%v %v", ok, err)
	}
	got, err := s.Get(ctx, alice, second.ID)
	if err != nil || !got.IsDefault {
		t.Fatalf("the default must pass to the remaining ready avatar: %+v %v", got, err)
	}
	if ok, _ := s.Delete(ctx, alice, first.ID); ok {
		t.Fatal("deleting twice reports nothing removed")
	}
}

func TestSetDefault(t *testing.T) {
	s := NewAvatarStore(testPool(t))
	ctx := context.Background()
	user := uuid.NewString()
	a := newAvatar(t, s, user, "")
	b := newAvatar(t, s, user, "")
	if _, err := s.SetDefault(ctx, user, b.ID); !errors.Is(err, avatars.ErrNotReady) {
		t.Fatalf("a training avatar cannot be the default: %v", err)
	}
	_, _ = s.Advance(ctx, b.ID, avatars.Update{TrainingStatus: "ready"})
	got, err := s.SetDefault(ctx, user, b.ID)
	if err != nil || !got.IsDefault {
		t.Fatalf("%+v %v", got, err)
	}
	if old, _ := s.Get(ctx, user, a.ID); old.IsDefault {
		t.Fatal("only one avatar may be the default")
	}
	if _, err := s.SetDefault(ctx, uuid.NewString(), b.ID); !errors.Is(err, avatars.ErrNotFound) {
		t.Fatalf("foreign: %v", err)
	}
}

func TestVoiceInUse(t *testing.T) {
	pool := testPool(t)
	s := NewAvatarStore(pool)
	ctx := context.Background()
	a := newAvatar(t, s, uuid.NewString(), "")
	_, _ = s.Advance(ctx, a.ID, avatars.Update{TwinVoiceID: sp("v-1")})
	if used, _ := s.VoiceInUse(ctx, "v-1", a.ID); used {
		t.Fatal("an avatar's own voice is not 'in use' by itself")
	}
	b := newAvatar(t, s, uuid.NewString(), "")
	_, _ = s.Advance(ctx, b.ID, avatars.Update{TwinVoiceID: sp("v-1")})
	if used, _ := s.VoiceInUse(ctx, "v-1", a.ID); !used {
		t.Fatal("another avatar using the voice must be noticed")
	}
}

func TestProfileStoreCreatesOnFirstSight(t *testing.T) {
	s := NewProfileStore(testPool(t))
	ctx := context.Background()
	id := uuid.NewString()

	first, err := s.Ensure(ctx, id, "a@example.com", "Ada")
	if err != nil || first.ID != id || first.DisplayName != "Ada" || first.Role != "user" || first.DeletedAt != nil {
		t.Fatalf("%+v %v", first, err)
	}
	again, err := s.Ensure(ctx, id, "changed@example.com", "Someone Else")
	if err != nil || again.Email != "a@example.com" || again.DisplayName != "Ada" {
		t.Fatalf("a repeat must not overwrite the stored profile: %+v %v", again, err)
	}
}

func TestHandoffTokensAreSingleUseAndExpire(t *testing.T) {
	s := NewHandoffStore(testPool(t))
	ctx := context.Background()
	user := uuid.NewString()
	live := time.Now().Add(10 * time.Minute)

	if err := s.Mint(ctx, user, hash("a"), live); err != nil {
		t.Fatal(err)
	}
	if owner, ok, _ := s.Resolve(ctx, hash("a")); !ok || owner != user {
		t.Fatalf("a live token resolves to its owner: %q %v", owner, ok)
	}
	if _, ok, _ := s.Resolve(ctx, hash("unknown")); ok {
		t.Fatal("an unknown token must not resolve")
	}

	// Minting again expires the earlier unclaimed token.
	if err := s.Mint(ctx, user, hash("b"), live); err != nil {
		t.Fatal(err)
	}
	if _, ok, _ := s.Resolve(ctx, hash("a")); ok {
		t.Fatal("refreshing must invalidate the old code")
	}

	if owner, ok, err := s.Claim(ctx, hash("b"), "p"); err != nil || !ok || owner != user {
		t.Fatalf("claim: %q %v %v", owner, ok, err)
	}
	if _, ok, _ := s.Claim(ctx, hash("b"), "p"); ok {
		t.Fatal("a token can be claimed once")
	}
	if _, ok, _ := s.Resolve(ctx, hash("b")); ok {
		t.Fatal("a claimed token no longer resolves")
	}

	if err := s.Mint(ctx, user, hash("old"), time.Now().Add(-time.Minute)); err != nil {
		t.Fatal(err)
	}
	if _, ok, _ := s.Resolve(ctx, hash("old")); ok {
		t.Fatal("an expired token must not resolve")
	}
}

func hash(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}

func TestAdminAlertsDedupeAndReopen(t *testing.T) {
	s := NewAlertStore(testPool(t))
	ctx := context.Background()
	user := uuid.NewString()
	a := alerts.Alert{Kind: "quota", Provider: "gemini", Message: "out of credit", UserID: user, Resource: "wf-1"}

	first, notify, err := s.Record(ctx, a)
	if err != nil || !notify || first.Count != 1 {
		t.Fatalf("first: %+v notify=%v %v", first, notify, err)
	}
	second, notify, _ := s.Record(ctx, a)
	if second.ID != first.ID || second.Count != 2 || notify {
		t.Fatalf("a repeat updates the same alert and does not renotify: %+v notify=%v", second, notify)
	}
	other, _, _ := s.Record(ctx, alerts.Alert{Kind: "quota", Provider: "heygen", Message: "m"})
	if other.ID == first.ID {
		t.Fatal("different providers are different alerts")
	}

	open, _ := s.List(ctx, true, 10)
	if len(open) != 2 {
		t.Fatalf("expected two open alerts, got %d", len(open))
	}
	if ok, _ := s.Resolve(ctx, first.ID); !ok {
		t.Fatal("resolve")
	}
	if ok, _ := s.Resolve(ctx, first.ID); ok {
		t.Fatal("resolving twice reports nothing resolved")
	}
	if ok, _ := s.Resolve(ctx, "not-a-uuid"); ok {
		t.Fatal("a malformed id resolves nothing")
	}
	reopened, notify, _ := s.Record(ctx, a)
	if reopened.ID == first.ID || reopened.Count != 1 || !notify {
		t.Fatalf("after resolving, the same problem opens a fresh alert and notifies: %+v notify=%v", reopened, notify)
	}
}
