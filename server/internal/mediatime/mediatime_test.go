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

func TestMP4SecondsAtFindsMoovAfterMediaData(t *testing.T) {
	// ftyp, a large mdat, then moov with an mvhd saying 12.5 seconds.
	ftyp := append([]byte{0, 0, 0, 16}, []byte("ftypisom\x00\x00\x00\x00")...)
	mdat := make([]byte, 5000)
	copy(mdat, []byte{0, 0, 0x13, 0x88})
	copy(mdat[4:], "mdat")
	mvhd := make([]byte, 8+100)
	copy(mvhd, []byte{0, 0, 0, 108})
	copy(mvhd[4:], "mvhd")
	// version 0: timescale at body[12:16], duration at body[16:20]
	copy(mvhd[8+12:], []byte{0, 0, 0x03, 0xE8})
	copy(mvhd[8+16:], []byte{0, 0, 0x30, 0xD4})
	moov := append([]byte{0, 0, 0, byte(8 + len(mvhd))}, []byte("moov")...)
	moov = append(moov, mvhd...)
	file := append(append(append([]byte{}, ftyp...), mdat...), moov...)
	reads := 0
	read := func(off, n int64) ([]byte, error) {
		reads++
		end := off + n
		if end > int64(len(file)) {
			end = int64(len(file))
		}
		return file[off:end], nil
	}
	got, ok := MP4SecondsAt(read, int64(len(file)))
	if !ok || math.Abs(got-12.5) > 1e-9 {
		t.Fatalf("got %v %v", got, ok)
	}
	if reads > 4 {
		t.Fatalf("read %d times; the media data should be skipped", reads)
	}
}
