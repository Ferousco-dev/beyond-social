package chat

import (
	"errors"
	"fmt"
	"math"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/generate"
	"github.com/Ferousco-dev/beyond-social/server/internal/orchestrator"
)

// ErrScriptTooLong means the script needs more clips than one plan may hold.
var ErrScriptTooLong = errors.New("that script is longer than I can make in one go")

// Clips cuts a script into clips a video model can make: each at most 15
// seconds, at least 3, and never splitting a scene. The picture, if any, starts
// the first clip, and sound is on for a clip only when someone speaks in it.
func (s Script) Clips() ([]generate.Request, error) {
	var clips []generate.Request
	var current []generate.Scene
	var voiced []bool
	seconds := 0
	flush := func() {
		if len(current) == 0 {
			return
		}
		clips = append(clips, generate.Request{Scenes: current, AspectRatio: "9:16", Sound: anyTrue(voiced)})
		current, voiced, seconds = nil, nil, 0
	}
	for _, sc := range s.Scenes {
		length := min(max(int(math.Round(sc.Seconds)), 1), generate.MaxShotSeconds)
		if seconds+length > generate.MaxClipSeconds {
			flush()
		}
		current = append(current, generate.Scene{Prompt: scenePrompt(sc, s.Style), Seconds: length})
		voiced = append(voiced, sc.Voiceover != "")
		seconds += length
	}
	flush()

	for i := range clips {
		if clips[i].TotalSeconds() < generate.MinClipSeconds {
			lengthenLast(&clips[i])
		}
	}
	if len(clips) > orchestrator.MaxSteps {
		return nil, ErrScriptTooLong
	}
	if len(clips) > 0 && s.ImageMediaID != "" {
		clips[0].ImageMediaID = s.ImageMediaID
		clips[0].AspectRatio = ""
	}
	for i, c := range clips {
		if err := c.Validate(); err != nil {
			return nil, fmt.Errorf("chat: clip %d: %w", i+1, err)
		}
	}
	return clips, nil
}

// lengthenLast stretches a clip that is shorter than the model's minimum.
func lengthenLast(c *generate.Request) {
	last := &c.Scenes[len(c.Scenes)-1]
	last.Seconds += generate.MinClipSeconds - c.TotalSeconds()
}

func scenePrompt(sc Scene, style string) string {
	parts := []string{strings.TrimRight(strings.TrimSpace(sc.Visual), ".") + "."}
	if sc.Camera != "" {
		parts = append(parts, "Camera: "+sc.Camera+".")
	}
	if sc.Voiceover != "" {
		parts = append(parts, fmt.Sprintf("A voice says: %q.", sc.Voiceover))
	}
	if sc.OnScreenText != "" {
		parts = append(parts, fmt.Sprintf("Text on screen: %q.", sc.OnScreenText))
	}
	if style != "" {
		parts = append(parts, "Style: "+style+".")
	}
	prompt := strings.Join(parts, " ")
	if utf8.RuneCountInString(prompt) > generate.MaxShotRunes {
		prompt = string([]rune(prompt)[:generate.MaxShotRunes])
	}
	return prompt
}

func anyTrue(values []bool) bool {
	for _, v := range values {
		if v {
			return true
		}
	}
	return false
}

// Plan turns the clips of a script into a workflow plan, one step per clip, run
// in order so a long script never has more than one clip being made at a time.
//
// When the user also asked to post it, a posting step follows the clip. That is
// only done for a single clip: several clips are not joined into one video yet,
// so there is no one video to post, and the note says so.
func (s Script) Plan(post *PostIntent) (orchestrator.Plan, string, error) {
	clips, err := s.Clips()
	if err != nil {
		return orchestrator.Plan{}, "", err
	}
	steps := make([]orchestrator.PlanStep, len(clips))
	for i, clip := range clips {
		steps[i] = orchestrator.PlanStep{
			ID: fmt.Sprintf("clip-%d", i+1), Tool: "generate_video", Args: clip.Args(), Needs: []string{},
		}
		if i > 0 {
			steps[i].Needs = []string{fmt.Sprintf("clip-%d", i)}
		}
	}
	objective := fmt.Sprintf("Make %q", s.Title)
	if len(clips) > 1 {
		objective = fmt.Sprintf("Make %q in %d clips", s.Title, len(clips))
	}
	note := ""
	switch {
	case post != nil && len(clips) == 1:
		steps = append(steps, postStep(s, post))
		objective += fmt.Sprintf(" and post it to %s", post.Platform)
	case post != nil:
		note = fmt.Sprintf("I will not post this one yet: it is %d clips and they are not joined into one video, so there is no single video to post.", len(clips))
	}
	return orchestrator.Plan{Version: orchestrator.PlanVersion, Objective: clipRunes(objective, orchestrator.MaxObjectiveRunes), Steps: steps}, note, nil
}

func postStep(s Script, post *PostIntent) orchestrator.PlanStep {
	caption := post.Caption
	if caption == "" {
		caption = s.Title
	}
	args := map[string]any{
		"platform": string(post.Platform), "caption": caption, "title": clipRunes(s.Title, 100), "video_from": "clip-1",
	}
	if post.At != nil {
		args["at"] = post.At.Format(time.RFC3339)
	}
	return orchestrator.PlanStep{ID: "post", Tool: "schedule_post", Args: args, Needs: []string{"clip-1"}}
}
