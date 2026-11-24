package social

import (
	"context"
	"net/url"
	"testing"
)

func TestSandboxConnectsAndPostsWithoutAnyKeys(t *testing.T) {
	ctx := context.Background()
	store := newMem()
	sb := Sandbox{For: TikTok}
	// keys(false): no app credentials exist at all.
	svc := NewService(store, xorSealer{}, keys(false), func(p Platform) string { return "https://api.example/cb/" + string(p) }, sb)

	list, err := svc.List(ctx, "u1")
	if err != nil || len(list) == 0 {
		t.Fatal(err)
	}
	for _, st := range list {
		if st.Platform == TikTok && (!st.Available || st.Label != "TikTok (test)") {
			t.Fatalf("the sandbox should be available without keys: %+v", st)
		}
	}

	link, err := svc.Begin(ctx, "u1", TikTok)
	if err != nil {
		t.Fatal(err)
	}
	u, _ := url.Parse(link)
	if u.Host != "api.example" || u.Query().Get("code") != "sandbox" {
		t.Fatalf("sign-in should come straight back to our callback: %s", link)
	}
	user, err := svc.Complete(ctx, TikTok, u.Query().Get("code"), u.Query().Get("state"))
	if err != nil || user != "u1" {
		t.Fatalf("complete: %q %v", user, err)
	}
	if err := svc.Usable(ctx, "u1", TikTok); err != nil {
		t.Fatalf("the test account should be usable: %v", err)
	}
	tokens, _, err := svc.Token(ctx, "u1", TikTok)
	if err != nil {
		t.Fatal(err)
	}
	got, err := sb.Publish(ctx, tokens, PublishInput{Video: []byte("mp4"), Caption: "hello"})
	if err != nil || got.ID == "" {
		t.Fatalf("publish: %+v %v", got, err)
	}
	if _, err := sb.Publish(ctx, tokens, PublishInput{Video: []byte("mp4"), Caption: "try " + FailWord}); err == nil {
		t.Fatal("the fail word should make the post fail")
	}
}
