package chat

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/orchestrator"
	"github.com/Ferousco-dev/beyond-social/server/internal/social"
)

func routeWith(t *testing.T, reply string) Decision {
	t.Helper()
	d, err := NewModelRouter(&stubJSON{out: reply}).Route(context.Background(), RouteInput{Message: "m"})
	if err != nil {
		t.Fatal(err)
	}
	return d
}

func TestRouterReadsAPostRequestAndAnUnreadableTimeNeverBecomesPostNow(t *testing.T) {
	d := routeWith(t, `{"intent":"create","reply":"","post_platform":"youtube","post_at":"2026-10-14T18:00:00+01:00","post_caption":" Rise early "}`)
	if d.Post == nil || d.Post.Platform != social.YouTube || d.Post.Caption != "Rise early" || d.Post.At == nil || d.Post.At.Hour() != 18 {
		t.Fatalf("post = %+v", d.Post)
	}
	if d := routeWith(t, `{"intent":"create","reply":"","post_platform":"youtube","post_at":"","post_caption":""}`); d.Post == nil || d.Post.At != nil {
		t.Fatalf("no time means as soon as it is ready: %+v", d.Post)
	}
	if d := routeWith(t, `{"intent":"create","reply":"","post_platform":"youtube","post_at":"tomorrow evening","post_caption":""}`); d.Post != nil {
		t.Fatalf("a time that cannot be read must drop the post, not post now: %+v", d.Post)
	}
	if d := routeWith(t, `{"intent":"create","reply":"","post_platform":"myspace","post_at":"","post_caption":""}`); d.Post != nil {
		t.Fatalf("an unknown platform: %+v", d.Post)
	}
	if d := routeWith(t, `{"intent":"create","reply":"","post_platform":"","post_at":"","post_caption":""}`); d.Post != nil {
		t.Fatalf("no platform: %+v", d.Post)
	}
}

func TestTheRouterIsToldWhatTimeItIsForTheUser(t *testing.T) {
	stub := &stubJSON{out: `{"intent":"chat","reply":"ok","post_platform":"","post_at":"","post_caption":""}`}
	now := time.Date(2026, 10, 13, 2, 30, 0, 0, time.FixedZone("BST", 3600))
	if _, err := NewModelRouter(stub).Route(context.Background(), RouteInput{Message: "hi", Now: now}); err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(stub.seen, "The user's current time: 2026-10-13T02:30:00+01:00") {
		t.Fatalf("prompt = %q", stub.seen)
	}
}

func TestASingleClipScriptCanBePostedAndTheStepWaitsForTheClip(t *testing.T) {
	at := time.Date(2026, 10, 14, 18, 0, 0, 0, time.UTC)
	plan, note, err := scriptOf(8).Plan(&PostIntent{Platform: social.YouTube, At: &at, Caption: "Rise early"})
	if err != nil || note != "" || len(plan.Steps) != 2 {
		t.Fatalf("plan = %+v note=%q err=%v", plan, note, err)
	}
	post := plan.Steps[1]
	if post.Tool != "schedule_post" || post.Needs[0] != "clip-1" || post.Args["video_from"] != "clip-1" || post.Args["at"] != "2026-10-14T18:00:00Z" || post.Args["caption"] != "Rise early" {
		t.Fatalf("post step = %+v", post)
	}
	if err := orchestrator.ValidatePlan(plan, orchestrator.DefaultRegistry()); err != nil {
		t.Fatalf("the plan fails validation: %v", err)
	}
	if !plan.RequiresApproval(orchestrator.DefaultRegistry()) {
		t.Fatal("posting must wait for approval")
	}
}

func TestSeveralClipsAreNotPostedAndTheUserIsToldWhy(t *testing.T) {
	plan, note, err := scriptOf(8, 8, 8).Plan(&PostIntent{Platform: social.YouTube})
	if err != nil || len(plan.Steps) != 3 || !strings.Contains(note, "3 clips") {
		t.Fatalf("plan steps=%d note=%q err=%v", len(plan.Steps), note, err)
	}
	for _, s := range plan.Steps {
		if s.Tool == "schedule_post" {
			t.Fatal("a post step was added to a multi-clip script")
		}
	}
}

func TestACaptionDefaultsToTheScriptTitle(t *testing.T) {
	plan, _, _ := scriptOf(8).Plan(&PostIntent{Platform: social.TikTok})
	if plan.Steps[1].Args["caption"] != "Dawn run" {
		t.Fatalf("args = %+v", plan.Steps[1].Args)
	}
	if _, has := plan.Steps[1].Args["at"]; has {
		t.Fatal("no time was asked for")
	}
}

func TestTheDescriptionSaysWhereAndWhenItWillPost(t *testing.T) {
	label := postLabel(map[string]any{"platform": "youtube", "at": "2026-10-14T18:00:00Z"})
	if !strings.Contains(label, "youtube") || !strings.Contains(label, "14 Oct at 18:00") {
		t.Fatalf("label = %q", label)
	}
	if !strings.Contains(postLabel(map[string]any{"platform": "tiktok"}), "as soon as it is ready") {
		t.Fatal("an immediate post should say so")
	}
}

func TestTheUsersTimeZoneIsUsedAndAnUnknownOneFallsBackToUTC(t *testing.T) {
	svc := newMemService()
	svc.now = func() time.Time { return time.Date(2026, 10, 13, 1, 0, 0, 0, time.UTC) }
	if got := svc.localNow("Asia/Tokyo"); got.Hour() != 10 {
		t.Fatalf("Tokyo = %v", got)
	}
	for _, zone := range []string{"", "Not/AZone"} {
		if got := svc.localNow(zone); got.Location() != time.UTC || got.Hour() != 1 {
			t.Fatalf("%q = %v", zone, got)
		}
	}
}
