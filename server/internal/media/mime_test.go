package media

import "testing"

func TestOtherNamesForTheSameFormatAreStoredUnderTheStandardOne(t *testing.T) {
	for given, want := range map[string]string{
		"audio/x-m4a":            "audio/mp4",
		"Audio/X-M4A":            "audio/mp4",
		"audio/x-wav":            "audio/wav",
		"audio/mp3":              "audio/mpeg",
		"image/jpg":              "image/jpeg",
		"audio/ogg; codecs=opus": "audio/ogg",
		"audio/mpeg":             "audio/mpeg",
	} {
		if got := canonicalMIME(given); got != want {
			t.Errorf("%s: got %s, want %s", given, got, want)
		}
		if _, ok := kinds[canonicalMIME(given)]; !ok {
			t.Errorf("%s is still refused", given)
		}
	}
}
