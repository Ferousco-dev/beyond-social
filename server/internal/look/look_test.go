package look

import (
	"strings"
	"testing"
)

// The words that make a generated video look AI-made. None of them may reach
// the video model from a look or setting someone picked on the form.
var aiLook = []string{"cinematic", "studio light", "film look", "dramatic", "vivid", "golden"}

func TestNoLookOnTheFormSendsWordsThatMakeVideosLookAIMade(t *testing.T) {
	for name := range styles {
		got := strings.ToLower(Style(name))
		for _, word := range aiLook {
			if strings.Contains(got, word) {
				t.Errorf("look %q becomes %q, which still says %q", name, got, word)
			}
		}
	}
}

func TestEveryLookOnTheFormIsTranslated(t *testing.T) {
	form := []string{"Bright and clean", "Cinematic", "Handheld, UGC feel", "Minimal studio", "Warm and natural", "Bold and high energy"}
	for _, name := range form {
		if Style(name) == name {
			t.Errorf("look %q reaches the model untranslated", name)
		}
	}
	if Style("Retro VHS") != "Retro VHS" {
		t.Error("a look the person typed themselves must be kept as they wrote it")
	}
}

func TestABriefKeepsTheSpokenWordsAndLosesTheStudioLook(t *testing.T) {
	brief := "Objective: Sell the serum\nCinematic\nSetting: Studio\nSays: Two drops every morning. Cinematic results.\nTone: Warm"
	got := Brief(brief)
	if strings.Contains(got, "\nCinematic\n") || strings.Contains(got, "Setting: Studio") {
		t.Fatalf("the look or setting was not translated:\n%s", got)
	}
	if !strings.Contains(got, "Says: Two drops every morning. Cinematic results.") {
		t.Fatalf("the spoken words must be kept exactly, even when they contain a look's name:\n%s", got)
	}
	if !strings.Contains(got, "Objective: Sell the serum") || !strings.Contains(got, "Tone: Warm") {
		t.Fatalf("other lines must be kept:\n%s", got)
	}
}

func TestAnAvatarKeepsItsPhotosBackgroundAndGetsARealLook(t *testing.T) {
	got := Direction("Warm delivery, speaking straight to camera. steady framing, head and shoulders. Cinematic. Setting: Studio")
	if strings.Contains(got, "Setting") || strings.Contains(strings.ToLower(got), "a small real studio") {
		t.Fatalf("an avatar keeps the background of its photo, so the setting must go: %s", got)
	}
	if strings.Contains(got, ". Cinematic") || !strings.Contains(got, "Moody but real") {
		t.Fatalf("the look was not translated: %s", got)
	}
	if !strings.HasPrefix(got, "Warm delivery, speaking straight to camera") {
		t.Fatalf("the delivery direction must stay first: %s", got)
	}
}
