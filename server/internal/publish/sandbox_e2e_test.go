package publish

import (
	"context"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/social"
)

// The whole path with the sandbox standing in for TikTok: a post is
// scheduled, its video is copied, it goes out, and a failure can be tried again.
func TestSandboxPostGoesOutAndAFailureCanBeTriedAgain(t *testing.T) {
	ctx := context.Background()
	store := newMem()
	sb := social.Sandbox{For: social.TikTok}
	proc := &Processor{
		Store: store, Fetcher: &fakeFetcher{data: mp4}, Vault: &fakeVault{uploaded: map[string]string{}},
		Tokens: fakeTokens{}, Publishers: map[social.Platform]social.Publisher{social.TikTok: sb}, Alerts: &recorder{},
	}
	svc := newService(fakeAccounts{}, store)
	run := func(id string) Post {
		for range 2 { // prepare, then publish
			proc.Handle(ctx, *store.posts[id])
		}
		return *store.posts[id]
	}

	ok, _, err := svc.Schedule(ctx, "u1", Request{Platform: social.TikTok, Caption: "Fresh zobo today #zobo", JobID: "job-1"}, "k1")
	if err != nil {
		t.Fatal(err)
	}
	if got := run(ok.ID); got.Status != StatusPublished || !strings.HasPrefix(got.ExternalID, "sandbox-") {
		t.Fatalf("the sandbox post should be published: %+v", got)
	}

	bad, _, _ := svc.Schedule(ctx, "u1", Request{Platform: social.TikTok, Caption: "please fail " + social.FailWord, JobID: "job-1"}, "k2")
	failed := run(bad.ID)
	if failed.Status != StatusFailed || !strings.Contains(failed.Error, "refused the post") {
		t.Fatalf("a refusal should fail with the platform's reason: %+v", failed)
	}
	// The person fixes what was wrong and tries again: the kept copy goes straight out.
	store.posts[bad.ID].Caption = "Fresh zobo today"
	if _, err := svc.Retry(ctx, "u1", bad.ID); err != nil {
		t.Fatal(err)
	}
	proc.Handle(ctx, *store.posts[bad.ID])
	if got := *store.posts[bad.ID]; got.Status != StatusPublished {
		t.Fatalf("after trying again: %+v", got)
	}
}
