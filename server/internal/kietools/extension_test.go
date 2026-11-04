package kietools

import "testing"

func TestUploadsUseTheExtensionProvidersExpect(t *testing.T) {
	for mimeType, want := range map[string]string{
		"audio/mpeg":               ".mp3",
		"image/jpeg":               ".jpg",
		"audio/mp4":                ".m4a",
		"audio/wav":                ".wav",
		"image/png":                ".png",
		"audio/ogg; codecs=opus":   ".ogg",
		"application/octet-stream": ".bin",
	} {
		if got := extensionFor(mimeType); got != want {
			t.Errorf("%s: got %q, want %q", mimeType, got, want)
		}
	}
}
