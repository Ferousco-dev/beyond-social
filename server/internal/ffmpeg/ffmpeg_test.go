package ffmpeg

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// makeClip renders a short test clip with ffmpeg itself.
func makeClip(t *testing.T, r Runner, name string, withSound bool) []byte {
	t.Helper()
	out := filepath.Join(t.TempDir(), name)
	args := []string{"-nostdin", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=320x240:rate=25:duration=3"}
	if withSound {
		args = append(args, "-f", "lavfi", "-i", "sine=frequency=440:duration=3", "-c:a", "aac")
	}
	args = append(args, "-c:v", "libx264", "-pix_fmt", "yuv420p", out)
	if b, err := exec.Command(r.Path, args...).CombinedOutput(); err != nil {
		t.Skipf("cannot render a test clip: %v %s", err, b)
	}
	data, err := os.ReadFile(out)
	if err != nil {
		t.Fatal(err)
	}
	return data
}

// streams lists the kinds of stream in a file, using ffprobe beside ffmpeg.
func streams(t *testing.T, r Runner, data []byte) string {
	t.Helper()
	probe := filepath.Join(filepath.Dir(r.Path), "ffprobe")
	if _, err := os.Stat(probe); err != nil {
		t.Skip("ffprobe not installed")
	}
	f := filepath.Join(t.TempDir(), "x.mp4")
	if err := os.WriteFile(f, data, 0o600); err != nil {
		t.Fatal(err)
	}
	b, err := exec.Command(probe, "-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", f).Output()
	if err != nil {
		t.Fatal(err)
	}
	return strings.Join(strings.Fields(string(b)), ",")
}

func TestWithSoundPutsTheOriginalSoundUnderTheEditedPicture(t *testing.T) {
	r := Find()
	if !r.Available() {
		t.Skip("ffmpeg not installed")
	}
	edited := makeClip(t, r, "edited.mp4", false)
	original := makeClip(t, r, "original.mp4", true)

	out, err := r.WithSound(context.Background(), edited, original)
	if err != nil {
		t.Fatal(err)
	}
	if got := streams(t, r, out); got != "video,audio" {
		t.Fatalf("streams = %q, want video,audio", got)
	}
}

func TestWithSoundKeepsASilentVideoWhenTheOriginalHasNoSound(t *testing.T) {
	r := Find()
	if !r.Available() {
		t.Skip("ffmpeg not installed")
	}
	edited := makeClip(t, r, "edited.mp4", false)
	original := makeClip(t, r, "original.mp4", false)

	out, err := r.WithSound(context.Background(), edited, original)
	if err != nil {
		t.Fatal(err)
	}
	if got := streams(t, r, out); got != "video" {
		t.Fatalf("streams = %q, want video", got)
	}
}

func TestWithSoundRefusesGarbage(t *testing.T) {
	r := Find()
	if !r.Available() {
		t.Skip("ffmpeg not installed")
	}
	if _, err := r.WithSound(context.Background(), []byte("not a video"), []byte("nor this")); err == nil {
		t.Fatal("garbage was accepted")
	}
}

func TestMissingFfmpegIsReported(t *testing.T) {
	if _, err := (Runner{}).WithSound(context.Background(), nil, nil); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("err = %v, want ErrUnavailable", err)
	}
}
