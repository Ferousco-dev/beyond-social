package avatars

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/heygen"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
	"github.com/Ferousco-dev/beyond-social/server/internal/storage"
	"github.com/Ferousco-dev/beyond-social/server/internal/voices"
)

const (
	alice     = "6f1c5a0e-7a53-4d0e-9f56-0a3f6a1b2c3d"
	bob       = "0b5d3c1a-2d4e-4f60-8a71-92b3c4d5e6f7"
	alicePath = alice + "/twin-1b2c3d4e-0000-4000-8000-000000000001.mp4"
)

type memRepo struct {
	mu   sync.Mutex
	rows map[string]Avatar
	seq  int
}

func newRepo() *memRepo { return &memRepo{rows: map[string]Avatar{}} }

func (m *memRepo) Create(_ context.Context, n NewAvatar) (Avatar, bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.seq++
	a := Avatar{ID: fmt.Sprintf("a-%d", m.seq), UserID: n.UserID, Name: n.Name, StoragePath: n.StoragePath, RerouteURL: n.RerouteURL,
		TrainingStatus: trainingPending, CreatedAt: time.Now(), UpdatedAt: time.Now()}
	m.rows[a.ID] = a
	return a, true, nil
}

func (m *memRepo) Get(_ context.Context, userID, id string) (Avatar, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if a, ok := m.rows[id]; ok && a.UserID == userID {
		return a, nil
	}
	return Avatar{}, ErrNotFound
}

func (m *memRepo) List(_ context.Context, userID string, limit, offset int) ([]Avatar, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var out []Avatar
	for _, a := range m.rows {
		if a.UserID == userID {
			out = append(out, a)
		}
	}
	return out, nil
}

func (m *memRepo) CountPending(_ context.Context, userID string) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	n := 0
	for _, a := range m.rows {
		if a.UserID == userID && a.TrainingStatus == trainingPending {
			n++
		}
	}
	return n, nil
}

func (m *memRepo) SelectVoice(_ context.Context, userID, id, voiceID string) (Avatar, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	a, ok := m.rows[id]
	if !ok || a.UserID != userID {
		return Avatar{}, ErrNotFound
	}
	a.VoiceID = voiceID
	m.rows[id] = a
	return a, nil
}

func (m *memRepo) Delete(_ context.Context, userID, id string) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if a, ok := m.rows[id]; ok && a.UserID == userID {
		delete(m.rows, id)
		return true, nil
	}
	return false, nil
}

func (m *memRepo) SetDefault(_ context.Context, userID, id string) (Avatar, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	a, ok := m.rows[id]
	if !ok || a.UserID != userID {
		return Avatar{}, ErrNotFound
	}
	if a.TrainingStatus != trainingReady {
		return Avatar{}, ErrNotReady
	}
	for k, v := range m.rows {
		if v.UserID == userID {
			v.IsDefault = k == id
			m.rows[k] = v
		}
	}
	return m.rows[id], nil
}

func (m *memRepo) VoiceInUse(_ context.Context, voiceID, except string) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, a := range m.rows {
		if a.ID != except && a.TwinVoiceID == voiceID {
			return true, nil
		}
	}
	return false, nil
}

func (m *memRepo) Claim(context.Context, int, time.Duration) ([]Avatar, error) { return nil, nil }

func (m *memRepo) Advance(_ context.Context, id string, u Update) (Avatar, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	a, ok := m.rows[id]
	if !ok {
		return Avatar{}, ErrNotFound
	}
	if a.TrainingStatus != trainingPending {
		return Avatar{}, ErrFinished
	}
	if u.TrainingStatus != "" {
		a.TrainingStatus = u.TrainingStatus
	}
	if u.GroupID != nil {
		a.GroupID = *u.GroupID
	}
	if u.LookID != nil {
		a.LookID = *u.LookID
	}
	if u.TwinVoiceID != nil && *u.TwinVoiceID != "" {
		a.TwinVoiceID = *u.TwinVoiceID
	}
	if u.SelectedVoiceID != nil && a.VoiceID == "" {
		a.VoiceID = *u.SelectedVoiceID
	}
	if u.ConsentStatus != nil {
		a.ConsentStatus = *u.ConsentStatus
	}
	if u.ConsentURL != nil {
		a.ConsentURL, a.ConsentExpiresAt = *u.ConsentURL, u.ConsentExpires
	}
	if u.Error != "" {
		a.Error = u.Error
	}
	if u.MarkSubmitting && a.SubmitStartedAt == nil {
		now := time.Now()
		a.SubmitStartedAt = &now
	}
	a.PollCount += u.PollDelta
	m.rows[id] = a
	return a, nil
}

func (m *memRepo) FootageGone(_ context.Context, id string, retryAt *time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	a := m.rows[id]
	if retryAt == nil {
		a.FootageDeleted, a.StoragePath = true, ""
	}
	m.rows[id] = a
	return nil
}

type fakeFooting struct {
	info      storage.Info
	statErr   error
	signErr   error
	deleteErr error
	deleted   []string
}

func (f *fakeFooting) Stat(context.Context, string, string) (storage.Info, error) {
	return f.info, f.statErr
}
func (f *fakeFooting) SignedURL(context.Context, string, string, time.Duration) (string, error) {
	return "https://storage.example/signed?token=1", f.signErr
}
func (f *fakeFooting) SignedUploadToken(context.Context, string, string) (string, error) {
	return "upload-token", f.signErr
}
func (f *fakeFooting) Delete(_ context.Context, _, path string) error {
	f.deleted = append(f.deleted, path)
	return f.deleteErr
}

type fakeProvider struct {
	createErr, groupErr, lookErr, consentErr error
	deleteGroupErr, deleteVoiceErr           error
	deletedGroups, deletedVoices             []string
	twin                                     heygen.Twin
	group, look                              heygen.Twin
	creates, consents                        int
	lastFileURL, lastKey                     string
}

func (f *fakeProvider) CreateDigitalTwin(_ context.Context, _, fileURL, key string) (heygen.Twin, error) {
	f.creates++
	f.lastFileURL, f.lastKey = fileURL, key
	return f.twin, f.createErr
}
func (f *fakeProvider) DeleteAvatarGroup(_ context.Context, id string) error {
	f.deletedGroups = append(f.deletedGroups, id)
	return f.deleteGroupErr
}

func (f *fakeProvider) DeleteVoice(_ context.Context, id string) error {
	f.deletedVoices = append(f.deletedVoices, id)
	return f.deleteVoiceErr
}

func (f *fakeProvider) GetGroup(context.Context, string) (heygen.Twin, error) {
	return f.group, f.groupErr
}
func (f *fakeProvider) GetLook(context.Context, string) (heygen.Twin, error) {
	return f.look, f.lookErr
}
func (f *fakeProvider) CreateConsent(context.Context, string, string, string) (string, error) {
	f.consents++
	return "https://consent.heygen/x", f.consentErr
}

type recorder struct {
	mu    sync.Mutex
	users []string
	types []string
}

func (r *recorder) Publish(userID string, e realtime.Event) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.users = append(r.users, userID)
	r.types = append(r.types, e.Type)
}

type voiceCheck map[string]bool

func (v voiceCheck) Allowed(_ context.Context, _ string, id string) error {
	if v[id] {
		return nil
	}
	return voices.ErrNotAllowed
}

type rig struct {
	repo     *memRepo
	footage  *fakeFooting
	provider *fakeProvider
	events   *recorder
	svc      *Service
	proc     *Processor
}

func newRig() *rig {
	r := &rig{repo: newRepo(), footage: &fakeFooting{info: storage.Info{Size: 5 << 20, ContentType: "video/mp4"}},
		provider: &fakeProvider{twin: heygen.Twin{GroupID: "g1", LookID: "l1", DefaultVoiceID: "voice-1", ConsentStatus: "pending"}}, events: &recorder{}}
	r.svc = NewService(r.repo, r.footage, r.provider, r.events, []string{"https://app.example.com"}).WithVoices(voiceCheck{"lib-voice": true, "voice-1": true})
	r.proc = &Processor{Service: r.svc, Repo: r.repo}
	return r
}

func goodInput() RegisterInput {
	return RegisterInput{StoragePath: alicePath, Name: "Sarah", ConsentVersion: ConsentVersion, ConsentConfirmed: true}
}

var ctx = context.Background()

func (r *rig) register(t *testing.T) Avatar {
	t.Helper()
	a, isNew, err := r.svc.Register(ctx, alice, goodInput())
	if err != nil || !isNew {
		t.Fatalf("register: %v new=%v", err, isNew)
	}
	return a
}

func TestRegisterQueuesAvatarAndPublishes(t *testing.T) {
	r := newRig()
	a := r.register(t)
	if a.Status != StatusTraining || a.UserID != alice || a.Name != "Sarah" || a.StoragePath != alicePath {
		t.Fatalf("unexpected %+v", a)
	}
	if len(r.events.users) != 1 || r.events.users[0] != alice || r.events.types[0] != EventUpdated {
		t.Fatalf("events %v", r.events.users)
	}
	if r.provider.creates != 0 {
		t.Fatal("registering must not call HeyGen inline")
	}
}

func TestRegisterEnforcesConsentOwnershipAndMedia(t *testing.T) {
	r := newRig()
	mutate := func(f func(*RegisterInput)) error {
		in := goodInput()
		f(&in)
		_, _, err := r.svc.Register(ctx, alice, in)
		return err
	}
	cases := map[string]struct {
		f    func(*RegisterInput)
		want error
	}{
		"no consent":          {func(i *RegisterInput) { i.ConsentConfirmed = false }, ErrConsentRequired},
		"old consent version": {func(i *RegisterInput) { i.ConsentVersion = 0 }, ErrConsentRequired},
		"someone else's file": {func(i *RegisterInput) { i.StoragePath = bob + "/twin-1b2c3d4e-0000-4000-8000-000000000001.mp4" }, ErrInvalid},
		"traversal":           {func(i *RegisterInput) { i.StoragePath = alice + "/../" + bob + "/twin-x.mp4" }, ErrInvalid},
		"odd file name":       {func(i *RegisterInput) { i.StoragePath = alice + "/passwords.txt" }, ErrInvalid},
		"mov not supported":   {func(i *RegisterInput) { i.StoragePath = alice + "/twin-1b2c3d4e-0000-4000-8000-000000000001.mov" }, ErrInvalid},
		"long name":           {func(i *RegisterInput) { i.Name = string(make([]rune, 61)) + "x" }, ErrInvalid},
		"foreign reroute":     {func(i *RegisterInput) { i.RerouteURL = "https://evil.example/steal" }, ErrInvalid},
		"bad idempotency key": {func(i *RegisterInput) { i.IdempotencyKey = "k\n" }, ErrInvalid},
	}
	for name, tc := range cases {
		if err := mutate(tc.f); !errors.Is(err, tc.want) {
			t.Errorf("%s: expected %v, got %v", name, tc.want, err)
		}
	}
	if len(r.repo.rows) != 0 {
		t.Fatal("rejected requests must not create avatars")
	}
	if err := mutate(func(i *RegisterInput) { i.RerouteURL = "https://app.example.com/dashboard/assets" }); err != nil {
		t.Fatalf("an allowed return address should pass: %v", err)
	}
}

func TestRegisterChecksTheRecording(t *testing.T) {
	cases := map[string]struct {
		info storage.Info
		err  error
		want error
	}{
		"missing":     {err: storage.ErrNotFound, want: ErrFootageMissing},
		"too large":   {info: storage.Info{Size: MaxFootageBytes + 1, ContentType: "video/mp4"}, want: ErrFootageTooLarge},
		"not a video": {info: storage.Info{Size: 10, ContentType: "image/png"}, want: ErrUnsupportedMedia},
		"quicktime":   {info: storage.Info{Size: 10, ContentType: "video/quicktime"}, want: ErrUnsupportedMedia},
	}
	for name, tc := range cases {
		r := newRig()
		r.footage.info, r.footage.statErr = tc.info, tc.err
		if _, _, err := r.svc.Register(ctx, alice, goodInput()); !errors.Is(err, tc.want) {
			t.Errorf("%s: expected %v, got %v", name, tc.want, err)
		}
	}
	r := newRig()
	r.footage.info = storage.Info{Size: -1, ContentType: ""}
	if _, _, err := r.svc.Register(ctx, alice, goodInput()); err != nil {
		t.Fatalf("an unreported size/type is allowed: %v", err)
	}
}

func TestRegisterCapsPendingAvatars(t *testing.T) {
	r := newRig()
	for range maxPendingAvatar {
		r.register(t)
	}
	if _, _, err := r.svc.Register(ctx, alice, goodInput()); !errors.Is(err, ErrTooManyBusy) {
		t.Fatalf("expected ErrTooManyBusy, got %v", err)
	}
}

func TestOwnershipOnReads(t *testing.T) {
	r := newRig()
	a := r.register(t)
	if _, err := r.svc.Get(ctx, bob, a.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("foreign get: %v", err)
	}
	if _, err := r.svc.RefreshConsent(ctx, bob, a.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("foreign consent refresh: %v", err)
	}
	if _, err := r.svc.SelectVoice(ctx, bob, a.ID, "lib-voice"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("foreign voice selection: %v", err)
	}
	if list, _, _ := r.svc.List(ctx, bob, 10, 0); len(list) != 0 {
		t.Fatal("another user listed avatars")
	}
}

func TestFullRegistrationLifecycle(t *testing.T) {
	r := newRig()
	a := r.register(t)

	// 1. Submit to HeyGen with a signed URL, never the storage path or any token of ours.
	r.proc.Handle(ctx, r.repo.rows[a.ID])
	got := r.repo.rows[a.ID]
	if got.GroupID != "g1" || got.LookID != "l1" || got.TwinVoiceID != "voice-1" || got.SubmitStartedAt == nil || got.TrainingStatus != trainingPending {
		t.Fatalf("after submit: %+v", got)
	}
	if r.provider.lastFileURL != "https://storage.example/signed?token=1" || r.provider.lastKey != "avatar-"+a.ID {
		t.Fatalf("unexpected provider call: %q %q", r.provider.lastFileURL, r.provider.lastKey)
	}

	// 2. HeyGen is waiting for consent: the person gets a link.
	r.provider.group = heygen.Twin{Status: heygen.StatusPendingConsent, ConsentStatus: heygen.ConsentPending}
	r.provider.look = heygen.Twin{Status: heygen.StatusCompleted}
	r.proc.Handle(ctx, r.repo.rows[a.ID])
	view, _ := r.svc.Get(ctx, alice, a.ID)
	if view.Status != StatusAwaitingConsent || view.ConsentURL != "https://consent.heygen/x" || r.provider.consents != 1 {
		t.Fatalf("awaiting consent: %+v consents=%d", view, r.provider.consents)
	}
	r.proc.Handle(ctx, r.repo.rows[a.ID])
	if r.provider.consents != 1 {
		t.Fatal("a live consent link must not be re-issued on every poll")
	}

	// 3. Consent accepted and training done: ready, with the cloned voice selected.
	r.provider.group = heygen.Twin{Status: heygen.StatusCompleted, ConsentStatus: heygen.ConsentAccepted, DefaultVoiceID: "voice-1"}
	r.proc.Handle(ctx, r.repo.rows[a.ID])
	view, _ = r.svc.Get(ctx, alice, a.ID)
	if view.Status != StatusReady || view.VoiceID != "voice-1" || view.ConsentURL != "" {
		t.Fatalf("ready: %+v", view)
	}

	// 4. The recording is deleted once the avatar is final.
	r.proc.Handle(ctx, r.repo.rows[a.ID])
	if len(r.footage.deleted) != 1 || r.footage.deleted[0] != alicePath || !r.repo.rows[a.ID].FootageDeleted {
		t.Fatalf("recording not cleaned up: %v", r.footage.deleted)
	}
	for _, u := range r.events.users {
		if u != alice {
			t.Fatalf("event for %q", u)
		}
	}
}

func TestProviderFailuresBecomeSafeMessages(t *testing.T) {
	for name, tc := range map[string]struct {
		group heygen.Twin
		msg   string
	}{
		"short footage": {heygen.Twin{Status: heygen.StatusFailed, ErrorCode: "training_failed", ErrorMessage: "Footage duration must be between 15s and 600s"}, msgTooShortOrLong},
		"other":         {heygen.Twin{Status: heygen.StatusFailed, ErrorCode: "x", ErrorMessage: "internal gpu error 0xdeadbeef"}, msgTraining},
		"rejected":      {heygen.Twin{Status: heygen.StatusPendingConsent, ConsentStatus: heygen.ConsentRejected}, msgConsent},
	} {
		t.Run(name, func(t *testing.T) {
			r := newRig()
			a := r.register(t)
			r.proc.Handle(ctx, r.repo.rows[a.ID])
			r.provider.group, r.provider.look = tc.group, heygen.Twin{Status: heygen.StatusProcessing}
			r.proc.Handle(ctx, r.repo.rows[a.ID])
			got := r.repo.rows[a.ID]
			if got.TrainingStatus != trainingFailed || got.Error != tc.msg {
				t.Fatalf("got %+v", got)
			}
			r.proc.Handle(ctx, r.repo.rows[a.ID]) // finished rows are only cleaned up
			if len(r.footage.deleted) != 1 {
				t.Fatalf("a failed avatar's recording must be deleted: %v", r.footage.deleted)
			}
		})
	}
}

func TestReadyWithoutVoiceFails(t *testing.T) {
	r := newRig()
	r.provider.twin.DefaultVoiceID = ""
	a := r.register(t)
	r.proc.Handle(ctx, r.repo.rows[a.ID])
	r.provider.group = heygen.Twin{Status: heygen.StatusCompleted, ConsentStatus: heygen.ConsentAccepted}
	r.provider.look = heygen.Twin{Status: heygen.StatusCompleted}
	r.proc.Handle(ctx, r.repo.rows[a.ID])
	if got := r.repo.rows[a.ID]; got.TrainingStatus != trainingFailed || got.Error != msgMissingVoice {
		t.Fatalf("an avatar with no voice must not be called ready: %+v", got)
	}
}

func TestTransientSubmitErrorsRetryWithTheSameIdempotencyKey(t *testing.T) {
	for name, err := range map[string]error{
		"server error":           &provider.Error{Provider: "heygen", Status: 503, Transient: true},
		"dropped connection":     &provider.Error{Provider: "heygen", Message: "request failed", Transient: true},
		"original still running": &provider.Error{Provider: "heygen", Status: 409},
	} {
		t.Run(name, func(t *testing.T) {
			r := newRig()
			r.provider.createErr = err
			a := r.register(t)
			for range 6 {
				r.proc.Handle(ctx, r.repo.rows[a.ID])
				if got := r.repo.rows[a.ID]; got.TrainingStatus != trainingPending || got.SubmitStartedAt == nil {
					t.Fatalf("a retryable failure must keep the avatar pending and remember the attempt: %+v", got)
				}
				if r.provider.lastKey != "avatar-"+a.ID {
					t.Fatalf("every attempt must reuse the key, got %q", r.provider.lastKey)
				}
			}
			if r.provider.creates != 6 {
				t.Fatalf("expected a retry each time, got %d calls", r.provider.creates)
			}
			// The provider recovers: the retry returns the (replayed or new) avatar once.
			r.provider.createErr = nil
			r.proc.Handle(ctx, r.repo.rows[a.ID])
			if got := r.repo.rows[a.ID]; got.GroupID != "g1" || got.TrainingStatus != trainingPending {
				t.Fatalf("recovery should save the provider ids: %+v", got)
			}
		})
	}
}

func TestPermanentSubmitErrorsFailWithoutRetrying(t *testing.T) {
	r := newRig()
	r.provider.createErr = &provider.Error{Provider: "heygen", Status: 402}
	a := r.register(t)
	r.proc.Handle(ctx, r.repo.rows[a.ID])
	if got := r.repo.rows[a.ID]; got.TrainingStatus != trainingFailed || got.Error != msgUnavailable || r.provider.creates != 1 {
		t.Fatalf("got %+v creates=%d", got, r.provider.creates)
	}
}

func TestSigningFailureHappensBeforeAnythingIsSent(t *testing.T) {
	r := newRig()
	r.footage.signErr = &provider.Error{Provider: "supabase-storage", Status: 500, Transient: true}
	a := r.register(t)
	r.proc.Handle(ctx, r.repo.rows[a.ID])
	if got := r.repo.rows[a.ID]; got.TrainingStatus != trainingPending || got.SubmitStartedAt != nil || r.provider.creates != 0 {
		t.Fatalf("got %+v creates=%d", got, r.provider.creates)
	}
}

func TestUnconfirmedSubmissionIsResumedWithinTheReplayWindowAndStoppedAfterIt(t *testing.T) {
	r := newRig()
	a := r.register(t)
	row := r.repo.rows[a.ID]
	started := time.Now().Add(-time.Hour)
	row.SubmitStartedAt = &started // a previous process died or lost the connection mid-call
	r.repo.rows[a.ID] = row

	r.proc.Handle(ctx, row)
	if got := r.repo.rows[a.ID]; got.GroupID != "g1" || r.provider.creates != 1 || r.provider.lastKey != "avatar-"+a.ID {
		t.Fatalf("inside the window the same key is resubmitted: %+v creates=%d", got, r.provider.creates)
	}

	r2 := newRig()
	b := r2.register(t)
	row2 := r2.repo.rows[b.ID]
	old := time.Now().Add(-replayWindow - time.Minute)
	row2.SubmitStartedAt = &old
	r2.repo.rows[b.ID] = row2
	r2.proc.Handle(ctx, row2)
	if got := r2.repo.rows[b.ID]; got.TrainingStatus != trainingFailed || got.Error != msgInterrupted || r2.provider.creates != 0 {
		t.Fatalf("past the window HeyGen can no longer replay it, so nothing is resubmitted: %+v creates=%d", got, r2.provider.creates)
	}
}

func TestRestartResumesPollingWithoutResubmitting(t *testing.T) {
	r := newRig()
	a := r.register(t)
	r.proc.Handle(ctx, r.repo.rows[a.ID])
	creates := r.provider.creates

	r.provider.group = heygen.Twin{Status: heygen.StatusCompleted, ConsentStatus: heygen.ConsentAccepted, DefaultVoiceID: "voice-1"}
	r.provider.look = heygen.Twin{Status: heygen.StatusCompleted}
	r.proc.Handle(ctx, r.repo.rows[a.ID]) // as if claimed by a new process
	if r.provider.creates != creates || r.repo.rows[a.ID].TrainingStatus != trainingReady {
		t.Fatal("an avatar with provider IDs must only be polled")
	}
}

func TestTransientPollErrorsKeepTheAvatarPending(t *testing.T) {
	r := newRig()
	a := r.register(t)
	r.proc.Handle(ctx, r.repo.rows[a.ID])
	r.provider.groupErr = &provider.Error{Provider: "heygen", Status: 503, Transient: true}
	r.proc.Handle(ctx, r.repo.rows[a.ID])
	if got := r.repo.rows[a.ID]; got.TrainingStatus != trainingPending {
		t.Fatalf("got %+v", got)
	}
	r.provider.groupErr = &provider.Error{Provider: "heygen", Status: 401}
	r.proc.Handle(ctx, r.repo.rows[a.ID])
	if got := r.repo.rows[a.ID]; got.TrainingStatus != trainingFailed {
		t.Fatalf("a permanent error should fail the avatar: %+v", got)
	}
}

func TestAvatarsAreAbandonedAfterMaxAge(t *testing.T) {
	r := newRig()
	a := r.register(t)
	r.proc.Now = func() time.Time { return time.Now().Add(maxAge + time.Hour) }
	r.proc.Handle(ctx, r.repo.rows[a.ID])
	if got := r.repo.rows[a.ID]; got.TrainingStatus != trainingFailed || got.Error != msgTimedOut {
		t.Fatalf("got %+v", got)
	}
}

func TestCleanupRetriesWhenDeleteFails(t *testing.T) {
	r := newRig()
	r.footage.deleteErr = errors.New("storage down")
	a := r.register(t)
	row := r.repo.rows[a.ID]
	row.TrainingStatus = trainingReady
	r.repo.rows[a.ID] = row
	r.proc.Handle(ctx, row)
	if r.repo.rows[a.ID].FootageDeleted {
		t.Fatal("a failed delete must not be recorded as done")
	}
	r.footage.deleteErr = nil
	r.proc.Handle(ctx, r.repo.rows[a.ID])
	if !r.repo.rows[a.ID].FootageDeleted {
		t.Fatal("the retry should delete it")
	}
}

func TestSelectVoice(t *testing.T) {
	r := newRig()
	a := r.register(t)
	if _, err := r.svc.SelectVoice(ctx, alice, a.ID, "lib-voice"); !errors.Is(err, ErrNotReady) {
		t.Fatalf("a training avatar cannot be given a voice: %v", err)
	}
	row := r.repo.rows[a.ID]
	row.TrainingStatus = trainingReady
	r.repo.rows[a.ID] = row

	if _, err := r.svc.SelectVoice(ctx, alice, a.ID, "someone-elses-voice"); !errors.Is(err, ErrVoiceNotAllowed) {
		t.Fatalf("a voice the user may not use must be refused: %v", err)
	}
	got, err := r.svc.SelectVoice(ctx, alice, a.ID, "lib-voice")
	if err != nil || got.VoiceID != "lib-voice" {
		t.Fatalf("%+v %v", got, err)
	}
}

func TestDeleteErasesEverywhereAndRefusalStopsIt(t *testing.T) {
	r := newRig()
	a := r.register(t)
	row := r.repo.rows[a.ID]
	row.GroupID, row.TwinVoiceID, row.TrainingStatus = "g1", "voice-1", trainingReady
	r.repo.rows[a.ID] = row

	// HeyGen refuses: nothing is removed, so the person is never told it is gone.
	r.provider.deleteGroupErr = errors.New("heygen down")
	if err := r.svc.Delete(ctx, alice, a.ID); err == nil {
		t.Fatal("expected the provider failure to surface")
	}
	if _, ok := r.repo.rows[a.ID]; !ok || len(r.footage.deleted) != 0 {
		t.Fatal("a provider refusal must leave the avatar in place")
	}

	r.provider.deleteGroupErr = nil
	if err := r.svc.Delete(ctx, alice, a.ID); err != nil {
		t.Fatal(err)
	}
	if _, ok := r.repo.rows[a.ID]; ok || len(r.provider.deletedGroups) != 2 || r.provider.deletedGroups[1] != "g1" ||
		len(r.provider.deletedVoices) != 1 || r.provider.deletedVoices[0] != "voice-1" || len(r.footage.deleted) != 1 {
		t.Fatalf("incomplete erasure: groups=%v voices=%v footage=%v", r.provider.deletedGroups, r.provider.deletedVoices, r.footage.deleted)
	}
	if last := r.events.types[len(r.events.types)-1]; last != EventDeleted {
		t.Fatalf("expected a deleted event, got %q", last)
	}
}

func TestDeleteKeepsAVoiceThatIsStillUsed(t *testing.T) {
	r := newRig()
	a, b := r.register(t), r.register(t)
	for _, id := range []string{a.ID, b.ID} {
		row := r.repo.rows[id]
		row.GroupID, row.TwinVoiceID = "g-"+id, "shared-voice"
		r.repo.rows[id] = row
	}
	if err := r.svc.Delete(ctx, alice, a.ID); err != nil {
		t.Fatal(err)
	}
	if len(r.provider.deletedVoices) != 0 {
		t.Fatalf("a voice another avatar uses must survive: %v", r.provider.deletedVoices)
	}
}

func TestDeleteAndDefaultAreOwnerScoped(t *testing.T) {
	r := newRig()
	a := r.register(t)
	if err := r.svc.Delete(ctx, bob, a.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("foreign delete: %v", err)
	}
	if _, ok := r.repo.rows[a.ID]; !ok || len(r.provider.deletedGroups) != 0 {
		t.Fatal("another user's delete must touch nothing")
	}
	if _, err := r.svc.SetDefault(ctx, bob, a.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("foreign default: %v", err)
	}
	if _, err := r.svc.SetDefault(ctx, alice, a.ID); !errors.Is(err, ErrNotReady) {
		t.Fatalf("a training avatar cannot be the default: %v", err)
	}
}
