package httpserver

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/buildinfo"
	"github.com/Ferousco-dev/beyond-social/server/internal/discovery"
	"github.com/Ferousco-dev/beyond-social/server/internal/handoff"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
	"github.com/Ferousco-dev/beyond-social/server/internal/transform"
	"github.com/golang-jwt/jwt/v5"
)

const (
	issuer = "https://project.supabase.co/auth/v1"
	alice  = "6f1c5a0e-7a53-4d0e-9f56-0a3f6a1b2c3d"
	bob    = "0b5d3c1a-2d4e-4f60-8a71-92b3c4d5e6f7"
)

type fakeRepo struct {
	rows   []jobs.Job
	getErr error
}

func (f *fakeRepo) Create(_ context.Context, j jobs.Job) (jobs.Job, bool, error) {
	if j.IdempotencyKey != "" {
		for _, e := range f.rows {
			if e.UserID == j.UserID && e.IdempotencyKey == j.IdempotencyKey {
				return e, false, nil
			}
		}
	}
	j.ID = fmt.Sprintf("00000000-0000-4000-8000-%012d", len(f.rows)+1)
	f.rows = append(f.rows, j)
	return j, true, nil
}

func (f *fakeRepo) CountActive(_ context.Context, userID, jobType string) (int, error) {
	n := 0
	for _, j := range f.rows {
		if j.UserID == userID && j.Type == jobType && !j.Status.Terminal() {
			n++
		}
	}
	return n, nil
}

func (f *fakeRepo) Claim(context.Context, string, int, time.Duration) ([]jobs.Job, error) {
	return nil, nil
}
func (f *fakeRepo) Advance(context.Context, string, jobs.Update) (jobs.Job, error) {
	return jobs.Job{}, nil
}
func (f *fakeRepo) ByProviderTask(context.Context, string) (jobs.Job, error) {
	return jobs.Job{}, jobs.ErrNotFound
}

func (f *fakeRepo) List(_ context.Context, userID string, limit, offset int) ([]jobs.Job, error) {
	var owned []jobs.Job
	for _, j := range f.rows {
		if j.UserID == userID {
			owned = append(owned, j)
		}
	}
	if offset >= len(owned) {
		return nil, nil
	}
	return owned[offset:min(offset+limit, len(owned))], nil
}

func (f *fakeRepo) Get(_ context.Context, userID, id string) (jobs.Job, error) {
	if f.getErr != nil {
		return jobs.Job{}, f.getErr
	}
	for _, j := range f.rows {
		if j.ID == id && j.UserID == userID {
			return j, nil
		}
	}
	return jobs.Job{}, jobs.ErrNotFound
}

type fakePinger struct{ err error }

func (p fakePinger) Ping(context.Context) error { return p.err }

type harness struct {
	handler     http.Handler
	key         *ecdsa.PrivateKey
	deps        Deps
	discoveries *fakeDiscoveries
	reconciler  *fakeReconciler
	jobs        *fakeRepo
	heygen      *heygenFixture
	profiles    *fakeProfiles
	handoffs    *fakeHandoffStore
}

// rebuild recreates the handler after a test changes h.deps.
func (h *harness) rebuild() { h.handler = NewApp(h.deps).Handler() }

func newHarness(t *testing.T, repo *fakeRepo, pinger Pinger) *harness {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	jwks := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]string{{
			"kty": "EC", "crv": "P-256", "kid": "k1",
			"x": base64.RawURLEncoding.EncodeToString(key.X.FillBytes(make([]byte, 32))),
			"y": base64.RawURLEncoding.EncodeToString(key.Y.FillBytes(make([]byte, 32))),
		}}})
	}))
	t.Cleanup(jwks.Close)

	hub := realtime.NewHub()
	t.Cleanup(func() { hub.Close(context.Background()) })
	disc := newFakeDiscoveries()
	jobService := jobs.NewService(repo, hub)
	discService := discovery.NewService(disc, hub)
	rec := &fakeReconciler{}
	h := &harness{key: key, discoveries: disc, reconciler: rec, jobs: repo}
	h.heygen = newHeygenFixture(jobService, hub)
	h.profiles = &fakeProfiles{rows: map[string]accounts.Profile{}}
	h.handoffs = newFakeHandoffStore()
	h.deps = Deps{
		Usage:           &fakeUsage{plan: credits.PlanFree},
		Accounts:        accounts.NewService(h.profiles),
		Handoff:         handoff.NewService(h.handoffs, h.heygen.avatars),
		AllowedOrigins:  []string{"https://app.example.com"},
		Avatars:         h.heygen.avatars,
		Voices:          h.heygen.voices,
		AvatarVideo:     h.heygen.videoService,
		Videos:          h.heygen.processor,
		VideoReconciler: h.heygen.processor,
		Jobs:            jobService,
		Discovery:       discService,
		Transform:       transform.NewService(jobService, discService),
		Reconciler:      rec,
		Verifier:        auth.NewVerifier(auth.Options{Issuer: issuer, JWKSURL: jwks.URL}),
		Database:        pinger,
		Hub:             hub,
	}
	h.rebuild()
	return h
}

func (h *harness) token(t *testing.T, sub string) string {
	t.Helper()
	tok := jwt.NewWithClaims(jwt.SigningMethodES256, jwt.MapClaims{
		"iss": issuer, "aud": "authenticated", "sub": sub, "email": "a@example.com",
		"role": "authenticated", "exp": time.Now().Add(time.Hour).Unix(),
	})
	tok.Header["kid"] = "k1"
	signed, err := tok.SignedString(h.key)
	if err != nil {
		t.Fatal(err)
	}
	return signed
}

func (h *harness) get(path, token string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, path, nil)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res := httptest.NewRecorder()
	h.handler.ServeHTTP(res, req)
	return res
}

func sampleJobs() []jobs.Job {
	return []jobs.Job{
		{ID: "11111111-1111-4111-8111-111111111111", UserID: alice, Type: "t", Status: jobs.StatusQueued},
		{ID: "22222222-2222-4222-8222-222222222222", UserID: alice, Type: "t", Status: jobs.StatusRunning},
		{ID: "33333333-3333-4333-8333-333333333333", UserID: bob, Type: "t", Status: jobs.StatusQueued},
	}
}

func TestHealthIsUnauthenticatedAndIndependentOfDatabase(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{err: errors.New("db down")})
	if res := h.get("/health", ""); res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.Code)
	}
}

func TestReadyReflectsDatabaseAvailability(t *testing.T) {
	up := newHarness(t, &fakeRepo{}, fakePinger{})
	if res := up.get("/ready", ""); res.Code != http.StatusOK {
		t.Fatalf("expected 200 when database is up, got %d", res.Code)
	}

	down := newHarness(t, &fakeRepo{}, fakePinger{err: errors.New("connection refused: postgres://u:secret@host")})
	res := down.get("/ready", "")
	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 when database is down, got %d", res.Code)
	}
	if strings.Contains(res.Body.String(), "secret") || strings.Contains(res.Body.String(), "refused") {
		t.Fatalf("readiness leaked internal detail: %s", res.Body)
	}
}

// A deploy waits for /ready to name the new commit, so a release that has not
// replaced the old one yet is never mistaken for it.
func TestReadyReportsTheBuiltCommit(t *testing.T) {
	previous := buildinfo.Commit
	buildinfo.Commit = "0123abc"
	t.Cleanup(func() { buildinfo.Commit = previous })

	res := newHarness(t, &fakeRepo{}, fakePinger{}).get("/ready", "")
	if res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"version":"0123abc"`) {
		t.Fatalf("ready: %d %s", res.Code, res.Body)
	}
}

func TestProtectedRoutesRequireAuthentication(t *testing.T) {
	h := newHarness(t, &fakeRepo{rows: sampleJobs()}, fakePinger{})
	for _, path := range []string{"/api/v1/me", "/api/v1/jobs", "/api/v1/jobs/" + sampleJobs()[0].ID} {
		for name, token := range map[string]string{"missing": "", "garbage": "abc"} {
			res := h.get(path, token)
			if res.Code != http.StatusUnauthorized {
				t.Errorf("%s (%s): expected 401, got %d", path, name, res.Code)
			}
			if res.Header().Get("WWW-Authenticate") == "" {
				t.Errorf("%s (%s): missing WWW-Authenticate", path, name)
			}
		}
	}
}

func TestMeReturnsVerifiedIdentity(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	res := h.get("/api/v1/me", h.token(t, alice))
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", res.Code, res.Body)
	}
	var body struct {
		Data auth.Identity `json:"data"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Data.UserID != alice || body.Data.Email != "a@example.com" {
		t.Fatalf("unexpected identity %+v", body.Data)
	}
}

func TestListJobsReturnsOnlyCallersJobsWithPagination(t *testing.T) {
	h := newHarness(t, &fakeRepo{rows: sampleJobs()}, fakePinger{})

	var body struct {
		Data       []jobs.Job `json:"data"`
		Pagination pagination `json:"pagination"`
	}
	res := h.get("/api/v1/jobs?limit=1", h.token(t, alice))
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.Code)
	}
	_ = json.Unmarshal(res.Body.Bytes(), &body)
	if len(body.Data) != 1 || !body.Pagination.HasMore || body.Pagination.Limit != 1 {
		t.Fatalf("unexpected page %+v", body)
	}

	res = h.get("/api/v1/jobs", h.token(t, bob))
	_ = json.Unmarshal(res.Body.Bytes(), &body)
	if len(body.Data) != 1 || body.Data[0].UserID != bob {
		t.Fatalf("bob must only see his own job: %+v", body.Data)
	}

	// A user_id query parameter must have no effect on whose jobs are returned.
	res = h.get("/api/v1/jobs?user_id="+alice, h.token(t, bob))
	_ = json.Unmarshal(res.Body.Bytes(), &body)
	if len(body.Data) != 1 || body.Data[0].UserID != bob {
		t.Fatalf("client-supplied user_id changed the result: %+v", body.Data)
	}
}

func TestListJobsRejectsBadPagination(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	for _, q := range []string{"limit=0", "limit=101", "limit=abc", "offset=-1", "offset=x"} {
		if res := h.get("/api/v1/jobs?"+q, h.token(t, alice)); res.Code != http.StatusBadRequest {
			t.Errorf("%s: expected 400, got %d", q, res.Code)
		}
	}
}

func TestGetJobHidesExistenceOfOtherUsersJobs(t *testing.T) {
	h := newHarness(t, &fakeRepo{rows: sampleJobs()}, fakePinger{})
	token := h.token(t, alice)

	if res := h.get("/api/v1/jobs/"+sampleJobs()[0].ID, token); res.Code != http.StatusOK {
		t.Fatalf("own job: expected 200, got %d", res.Code)
	}

	foreign := h.get("/api/v1/jobs/"+sampleJobs()[2].ID, token)
	missing := h.get("/api/v1/jobs/99999999-9999-4999-8999-999999999999", token)
	if foreign.Code != http.StatusNotFound || missing.Code != http.StatusNotFound {
		t.Fatalf("expected 404/404, got %d/%d", foreign.Code, missing.Code)
	}
	if foreign.Body.String() != missing.Body.String() {
		t.Fatalf("foreign and missing responses differ:\n%s\n%s", foreign.Body, missing.Body)
	}
}

func TestGetJobRejectsMalformedID(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	if res := h.get("/api/v1/jobs/not-a-uuid", h.token(t, alice)); res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", res.Code)
	}
}

func TestInternalErrorsAreNotLeaked(t *testing.T) {
	repo := &fakeRepo{getErr: errors.New(`pq: relation "public.jobs" password=hunter2`)}
	h := newHarness(t, repo, fakePinger{})
	res := h.get("/api/v1/jobs/"+sampleJobs()[0].ID, h.token(t, alice))
	if res.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", res.Code)
	}
	if strings.Contains(res.Body.String(), "hunter2") || strings.Contains(res.Body.String(), "relation") {
		t.Fatalf("internal detail leaked: %s", res.Body)
	}
}

func TestUnknownRouteAndWrongMethod(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	if res := h.get("/nope", ""); res.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", res.Code)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/jobs", nil)
	res := httptest.NewRecorder()
	h.handler.ServeHTTP(res, req)
	if res.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", res.Code)
	}
}

func TestMain(m *testing.M) {
	slog.SetDefault(slog.New(slog.NewTextHandler(io.Discard, nil)))
	os.Exit(m.Run())
}
