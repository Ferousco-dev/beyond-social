package mediatime

import (
	"math"
	"os"
	"testing"
)

// The files in testdata are three seconds of tone, made with ffmpeg.
func TestEachVoiceFormatReadsItsLength(t *testing.T) {
	for file, mimeType := range map[string]string{
		"tone.m4a":     "audio/mp4",
		"tone.wav":     "audio/wav",
		"tone.mp3":     "audio/mpeg",
		"tone-vbr.mp3": "audio/mpeg",
		"tone.ogg":     "audio/ogg; codecs=opus",
	} {
		data, err := os.ReadFile("testdata/" + file)
		if err != nil {
			t.Fatal(err)
		}
		seconds, ok := Seconds(data, mimeType)
		if !ok || math.Abs(seconds-3) > 0.15 {
			t.Errorf("%s: got %.3fs (%v), want about 3s", file, seconds, ok)
		}
	}
}

func TestUnknownOrDamagedFilesSayTheyCannotBeRead(t *testing.T) {
	for name, input := range map[string]struct {
		data     []byte
		mimeType string
	}{
		"image":     {[]byte("\x89PNG...."), "image/png"},
		"empty mp4": {nil, "audio/mp4"},
		"bad wav":   {[]byte("RIFF\x00\x00\x00\x00WAVE"), "audio/wav"},
		"not ogg":   {[]byte("hello"), "audio/ogg"},
		"not mp3":   {[]byte("hello there"), "audio/mpeg"},
	} {
		if seconds, ok := Seconds(input.data, input.mimeType); ok {
			t.Errorf("%s: read %.2fs from a file that is not valid", name, seconds)
		}
	}
}
