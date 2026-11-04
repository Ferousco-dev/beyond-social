package httpserver

import (
	"net/http"
	"testing"
	"time"
)

func TestABurstIsAllowedThenSlowedAndRefills(t *testing.T) {
	l := newLimiter()
	clock := time.Date(2026, 10, 13, 12, 0, 0, 0, time.UTC)
	l.now = func() time.Time { return clock }

	for i := 0; i < int(userBurst); i++ {
		if ok, _ := l.allow("u1"); !ok {
			t.Fatalf("request %d of the burst was refused", i+1)
		}
	}
	if ok, wait := l.allow("u1"); ok || wait <= 0 || wait > time.Second {
		t.Fatalf("past the burst: ok=%v wait=%v", ok, wait)
	}
	if ok, _ := l.allow("u2"); !ok {
		t.Fatal("one person's burst used up someone else's allowance")
	}
	clock = clock.Add(time.Second)
	for i := 0; i < int(userRate); i++ {
		if ok, _ := l.allow("u1"); !ok {
			t.Fatalf("after a second only %d of %d requests were allowed", i, int(userRate))
		}
	}
	if ok, _ := l.allow("u1"); ok {
		t.Fatal("more than a second's worth came back")
	}
}

func TestQuietPeopleAreForgotten(t *testing.T) {
	l := newLimiter()
	clock := time.Date(2026, 10, 13, 12, 0, 0, 0, time.UTC)
	l.now = func() time.Time { return clock }
	for i := 0; i < sweepAt; i++ {
		l.allow(string(rune(i)) + "x")
	}
	clock = clock.Add(2 * idleAfter)
	l.allow("someone-new")
	if len(l.buckets) > 2 {
		t.Fatalf("%d buckets kept after everyone went quiet", len(l.buckets))
	}
}

func TestTheAPIAnswers429WithRetryAfterWhenAPersonGoesTooFast(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.rebuild()
	a := h.token(t, alice)
	var last int
	for i := 0; i <= int(userBurst)+5; i++ {
		res := send(h, http.MethodGet, "/api/v1/me", a, "")
		last = res.Code
		if res.Code == http.StatusTooManyRequests {
			if res.Header().Get("Retry-After") == "" {
				t.Fatal("429 without Retry-After")
			}
			return
		}
	}
	t.Fatalf("never limited; last status %d", last)
}
