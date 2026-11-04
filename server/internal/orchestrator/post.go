package orchestrator

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/publish"
	"github.com/Ferousco-dev/beyond-social/server/internal/social"
)

// PostArgs is a schedule_post step, read and checked.
type PostArgs struct {
	Request publish.Request
	// VideoFrom names the step that makes the video, when it is part of the same plan.
	VideoFrom string
}

// ParsePostArgs reads schedule_post arguments. Unknown ones are refused so a plan
// cannot carry anything the person did not approve.
func ParsePostArgs(args map[string]any) (PostArgs, error) {
	var out PostArgs
	for name := range args {
		switch name {
		case "platform", "caption", "title", "visibility", "at", "video_from", "job_id":
		default:
			return PostArgs{}, fmt.Errorf("unknown argument %q", name)
		}
	}
	platform := social.Platform(strArg(args, "platform"))
	if !platform.Valid() {
		return PostArgs{}, errors.New("argument \"platform\" must be youtube, tiktok or instagram")
	}
	out.Request = publish.Request{
		Platform:   platform,
		Caption:    strArg(args, "caption"),
		Title:      strArg(args, "title"),
		Visibility: strArg(args, "visibility"),
		JobID:      strArg(args, "job_id"),
	}
	out.VideoFrom = strArg(args, "video_from")
	if (out.Request.JobID == "") == (out.VideoFrom == "") {
		return PostArgs{}, errors.New("say which video with exactly one of video_from and job_id")
	}
	if strings.TrimSpace(out.Request.Caption) == "" && platform != social.YouTube {
		return PostArgs{}, errors.New("a caption is required")
	}
	if at := strArg(args, "at"); at != "" {
		t, err := time.Parse(time.RFC3339, at)
		if err != nil {
			return PostArgs{}, errors.New("argument \"at\" must be an RFC 3339 time with a time zone")
		}
		out.Request.At = &t
	}
	return out, nil
}
