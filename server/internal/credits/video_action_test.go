package credits

import "testing"

func TestAClipWithSoundIsPricedAsItsOwnAction(t *testing.T) {
	if got := VideoAction(false); got != "video_generate_second" {
		t.Fatalf("silent clip priced as %q", got)
	}
	if got := VideoAction(true); got != "video_generate_sound_second" {
		t.Fatalf("clip with sound priced as %q", got)
	}
}
