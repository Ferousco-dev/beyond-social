package generate

import (
	"context"
	"errors"
	"strings"
	"testing"
	"unicode/utf8"
)

type fakeDirector struct {
	out string
	err error
	got string
}

func (f *fakeDirector) Direct(_ context.Context, brief string, _ int, _ bool, _ int) (string, error) {
	f.got = brief
	return f.out, f.err
}

const brief = "Objective: sell handmade soap\nPurpose: promote\nTarget audience: women 25-40\nFormat for TikTok\nSetting: bright kitchen\nSays: \"It smells like fresh lemons\"\nEnds with: Buy now\nMusic: upbeat"

func TestFallbackDropsBusinessLinesAndKeepsThePicture(t *testing.T) {
	out := ApplyRealism(brief, MaxSingleRunes)
	for _, gone := range []string{"Purpose:", "Target audience", "Format for", "Ends with", "Music:", "Objective:"} {
		if strings.Contains(out, gone) {
			t.Fatalf("%q should be gone: %s", gone, out)
		}
	}
	for _, kept := range []string{"sell handmade soap", "bright kitchen", "It smells like fresh lemons", "ordinary available light"} {
		if !strings.Contains(out, kept) {
			t.Fatalf("%q missing: %s", kept, out)
		}
	}
}

func TestFallbackNeverPassesTheShotLimit(t *testing.T) {
	long := strings.Repeat("a long description of the scene ", 60)
	out := ApplyRealism(long, MaxShotRunes)
	if n := utf8.RuneCountInString(out); n > MaxShotRunes {
		t.Fatalf("%d characters, limit %d", n, MaxShotRunes)
	}
	if !strings.HasSuffix(out, "no on-screen text or logos.") {
		t.Fatalf("the realism look was cut off: %s", out)
	}
}

func TestADirectorsRewriteIsUsedAndCappedAtTheLimit(t *testing.T) {
	d := &fakeDirector{out: strings.Repeat("x", MaxShotRunes+200)}
	got := Builder{Director: d}.directShot(context.Background(), brief, 5, false, MaxShotRunes)
	if utf8.RuneCountInString(got) != MaxShotRunes || d.got != brief {
		t.Fatalf("len %d, brief passed on: %v", utf8.RuneCountInString(got), d.got == brief)
	}
}

func TestADirectorFailureFallsBackInsteadOfFailingTheRender(t *testing.T) {
	for _, d := range []Director{&fakeDirector{err: errors.New("gemini down")}, &fakeDirector{out: "  "}, nil} {
		got := Builder{Director: d}.directShot(context.Background(), brief, 5, false, MaxSingleRunes)
		if !strings.Contains(got, "ordinary available light") || strings.Contains(got, "Purpose:") {
			t.Fatalf("no fallback: %s", got)
		}
	}
}

func TestClipsRenderInTheHigherQualityMode(t *testing.T) {
	if mode != "pro" {
		t.Fatalf("mode = %s", mode)
	}
}
