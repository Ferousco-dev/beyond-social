// Package ffmpeg runs the ffmpeg program for the few jobs a provider cannot do,
// such as putting a person's own sound back on a video the provider returned
// silent. Every file goes through a private temporary folder that is removed
// afterwards, and ffmpeg is never handed anything but those files.
package ffmpeg

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// ErrUnavailable means ffmpeg is not installed where the server runs.
var ErrUnavailable = errors.New("ffmpeg is not available")

// Timeout bounds one run. Copying a short video's picture and re-encoding its
// sound takes seconds; anything slower is stuck.
const Timeout = 2 * time.Minute

// Runner finds and runs ffmpeg.
type Runner struct {
	// Path is the ffmpeg program. Empty means it is not installed.
	Path string
}

// Find looks for ffmpeg: the FFMPEG_PATH setting first, then the PATH.
// A Runner with an empty Path is returned when there is none.
func Find() Runner {
	if p := strings.TrimSpace(os.Getenv("FFMPEG_PATH")); p != "" {
		if _, err := os.Stat(p); err == nil {
			return Runner{Path: p}
		}
		return Runner{}
	}
	if p, err := exec.LookPath("ffmpeg"); err == nil {
		return Runner{Path: p}
	}
	return Runner{}
}

// Available says whether ffmpeg can be run.
func (r Runner) Available() bool { return r.Path != "" }

// WithSound returns the picture of video with the sound of source laid under
// it. The picture is copied untouched; the sound is encoded as AAC so any phone
// recording fits an MP4. The result is cut to the shorter of the two. When
// source has no sound, the video is returned as an MP4 without it.
func (r Runner) WithSound(ctx context.Context, video, source []byte) ([]byte, error) {
	if !r.Available() {
		return nil, ErrUnavailable
	}
	dir, err := os.MkdirTemp("", "bs-mux-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)

	in, src, out := filepath.Join(dir, "video.mp4"), filepath.Join(dir, "source.mov"), filepath.Join(dir, "out.mp4")
	if err := os.WriteFile(in, video, 0o600); err != nil {
		return nil, err
	}
	if err := os.WriteFile(src, source, 0o600); err != nil {
		return nil, err
	}
	err = r.run(ctx,
		"-i", in, "-i", src,
		"-map", "0:v:0", "-map", "1:a:0?",
		"-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
		"-shortest", "-movflags", "+faststart",
		out,
	)
	if err != nil {
		return nil, err
	}
	return os.ReadFile(out)
}

// run calls ffmpeg with fixed safe options in front: no prompts, no network
// protocols, a small thread budget for a small server.
func (r Runner) run(ctx context.Context, args ...string) error {
	ctx, cancel := context.WithTimeout(ctx, Timeout)
	defer cancel()
	base := []string{"-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-threads", "2", "-protocol_whitelist", "file,pipe"}
	cmd := exec.CommandContext(ctx, r.Path, append(base, args...)...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if len(msg) > 500 {
			msg = msg[:500]
		}
		return fmt.Errorf("ffmpeg: %w: %s", err, msg)
	}
	return nil
}
