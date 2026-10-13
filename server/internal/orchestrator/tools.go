package orchestrator

import (
	"slices"
	"strings"

	"github.com/Ferousco-dev/beyond-social/server/internal/generate"
	"github.com/Ferousco-dev/beyond-social/server/internal/kietools"
)

// What a step output holds, so a later step can be checked before anything runs.
const (
	KindID     = "id"
	KindURL    = "url"
	KindText   = "text"
	KindNumber = "number"
)

// Output is a value a finished step makes available to later steps, written
// ${step.path} in their arguments.
type Output struct {
	Path        string
	Kind        string
	Description string
}

// Tool describes one backend-controlled capability a plan may use. The registry
// decides what a plan may name; a Runner decides how the step is carried out.
type Tool struct {
	Name        string
	Description string
	// ReadOnly tools never spend money or change provider state.
	ReadOnly bool
	// Billable tools may consume paid provider credits.
	Billable bool
	// Public tools do something in the outside world that cannot be undone,
	// such as posting to a social account. They always wait for approval.
	Public bool
	// Args documents the arguments for the planner, one line each.
	Args []string
	// Outputs are what later steps may reference.
	Outputs []Output
	// ValidateArgs rejects malformed or out-of-range arguments.
	ValidateArgs func(args map[string]any) error
}

// Registry is the closed set of tools plans may reference.
type Registry struct {
	tools    map[string]Tool
	disabled map[string]bool
}

func NewRegistry(tools ...Tool) *Registry {
	r := &Registry{tools: make(map[string]Tool, len(tools)), disabled: map[string]bool{}}
	for _, tool := range tools {
		r.Register(tool)
	}
	return r
}

// Register adds a tool, replacing one with the same name.
func (r *Registry) Register(tool Tool) { r.tools[tool.Name] = tool }

// Disable takes a tool out of use, for example when what it needs is not
// connected. Plans can no longer name it and the planner is not told about it.
func (r *Registry) Disable(name string) { r.disabled[name] = true }

// Get returns the tool and whether plans may use it.
func (r *Registry) Get(name string) (Tool, bool) {
	tool, ok := r.tools[name]
	return tool, ok && !r.disabled[name]
}

// Registered reports whether a tool exists at all, in use or not.
func (r *Registry) Registered(name string) bool {
	_, ok := r.tools[name]
	return ok
}

// Tools lists the tools in use, in a fixed order so the planner's prompt stays
// identical between requests.
func (r *Registry) Tools() []Tool {
	out := make([]Tool, 0, len(r.tools))
	for name, tool := range r.tools {
		if !r.disabled[name] {
			out = append(out, tool)
		}
	}
	slices.SortFunc(out, func(a, b Tool) int { return strings.Compare(a.Name, b.Name) })
	return out
}

// Names lists the names of the tools in use, sorted.
func (r *Registry) Names() []string {
	tools := r.Tools()
	names := make([]string, len(tools))
	for i, tool := range tools {
		names[i] = tool.Name
	}
	return names
}

// jobOutputs is what every tool that makes a video offers to later steps.
func jobOutputs() []Output {
	return []Output{
		{"ref", KindID, "the id of the video job"},
		{"result.video_url", KindURL, "the finished video"},
		{"result.thumbnail_url", KindURL, "a still from the video"},
		{"result.duration_seconds", KindNumber, "how long the video is"},
	}
}

func fileOutputs(path, kind, what string) []Output {
	return []Output{{"ref", KindID, "the id of the job"}, {"result." + path, kind, what}}
}

// DefaultRegistry exposes the capabilities that are built: Apify discovery, KIE
// video, HeyGen avatar videos, posting, and read-only status lookups.
func DefaultRegistry() *Registry {
	discover := objectArgs(map[string]argRule{
		"platform": {required: true, oneOf: []string{"tiktok", "instagram"}},
		"query":    {maxRunes: 300},
		"url":      {maxRunes: 2000},
		"limit":    {minInt: 1, maxInt: 20},
	}, "platform")
	transform := objectArgs(map[string]argRule{
		"video_id": {required: true, maxRunes: 64},
		"prompt":   {required: true, minRunes: 1, maxRunes: 2000},
	}, "video_id", "prompt")
	avatar := objectArgs(map[string]argRule{
		"avatar_id": {required: true, maxRunes: 64},
		"script":    {required: true, minRunes: 1, maxRunes: 2000},
	}, "avatar_id", "script")
	jobStatus := objectArgs(map[string]argRule{"job_id": {required: true, maxRunes: 64}}, "job_id")
	workflowStatus := objectArgs(map[string]argRule{"workflow_id": {required: true, maxRunes: 64}}, "workflow_id")

	return NewRegistry(
		Tool{
			Name:         "discover_videos",
			Description:  "Search TikTok or Instagram for videos by keyword, or look up one video from its link, using Apify.",
			Billable:     true,
			Args:         append(discover.docs, "give either query or url, not both"),
			Outputs:      []Output{{"ref", KindID, "the id of the search"}, {"result_count", KindNumber, "how many videos were found"}},
			ValidateArgs: discover.validate,
		},
		Tool{
			Name:         "transform_video",
			Description:  "Remake a discovered video in a new style from a text prompt, using KIE.",
			Billable:     true,
			Args:         transform.docs,
			Outputs:      jobOutputs(),
			ValidateArgs: transform.validate,
		},
		Tool{
			Name:         "create_avatar_video",
			Description:  "Make a video of one of the user's trained avatars speaking a script.",
			Billable:     true,
			Args:         avatar.docs,
			Outputs:      jobOutputs(),
			ValidateArgs: avatar.validate,
		},
		Tool{
			Name:        "generate_video",
			Description: "Make a new video clip from scene descriptions with Kling, optionally starting from a picture the user attached.",
			Billable:    true,
			Args: []string{
				"scenes (required): 1 to 6 scenes, each {prompt, seconds}; the clip runs 3 to 15 seconds in total",
				"image_media_id: the id of a picture the user attached, used as the first frame",
				"aspect_ratio: 16:9, 9:16 or 1:1 (ignored when there is a picture)",
				"sound: true to also make speech and ambience, which costs more",
			},
			Outputs: jobOutputs(),
			ValidateArgs: func(args map[string]any) error {
				_, err := generate.ParseArgs(args)
				return err
			},
		},
		Tool{
			Name:        "edit_image",
			Description: "Change a picture from a description, for example put the person in it into a new scene, keeping their face the same. Make this its own plan when the user wants to see the picture before a video is made from it.",
			Billable:    true,
			Args: []string{
				"prompt (required): what to change; say to keep the person's face, hair and skin identical when there is a person",
				"image_media_ids: ids of pictures the user attached",
				"image_urls: links to pictures made by earlier steps, normally ${step.result.image_url}",
				"1 to 4 pictures in total; the first is the main one",
				"aspect_ratio: auto, 16:9, 9:16, 1:1, 4:3 or 3:4",
			},
			Outputs: fileOutputs("image_url", KindURL, "the edited picture"),
			ValidateArgs: func(args map[string]any) error {
				_, err := kietools.ParseEdit(args)
				return err
			},
		},
		Tool{
			Name:        "talking_photo",
			Description: "Make a still picture speak a voice recording as a video. The voice is played exactly as given, never changed.",
			Billable:    true,
			Args: []string{
				"image_media_id or image_url (required): the picture, an attached file or ${step.result.image_url}",
				"audio_media_id or audio_url (required): the voice, an attached file or ${step.result.audio_url}",
				"prompt (required): the expression, movement and camera, not the words spoken",
				"seconds (required): how long the voice runs, 1 to 60; about 2.5 spoken words per second",
			},
			Outputs: jobOutputs(),
			ValidateArgs: func(args map[string]any) error {
				_, err := kietools.ParseTalk(args)
				return err
			},
		},
		Tool{
			Name:        "speak_text",
			Description: "Turn text into a voice recording with a ready-made voice. It cannot copy a real person's voice.",
			Billable:    true,
			Args: []string{
				"text (required): what to say, up to 5000 characters",
				"voice: the id of a ready-made voice; leave out for the default",
			},
			Outputs: fileOutputs("audio_url", KindURL, "the voice recording"),
			ValidateArgs: func(args map[string]any) error {
				_, err := kietools.ParseSpeech(args)
				return err
			},
		},
		Tool{
			Name:        "check_script",
			Description: "Read a voice-over script and say whether it is ready to be spoken, with a corrected version when it is not.",
			ReadOnly:    true,
			Args:        []string{"script (required): the text to review, up to 5000 characters"},
			Outputs: []Output{
				{"verdict", KindText, "good or fix"},
				{"issues", KindText, "what to change, empty when good"},
				{"script", KindText, "the script ready to be spoken, normally passed to speak_text"},
			},
			ValidateArgs: func(args map[string]any) error {
				_, err := kietools.ParseCheckArgs(args)
				return err
			},
		},
		Tool{
			Name:        "schedule_post",
			Description: "Post a finished video to one of the user's connected accounts, now or at a chosen time.",
			Public:      true,
			Args: []string{
				"platform (required): youtube, tiktok or instagram",
				"caption: the text to post (required except on youtube)",
				"title, visibility (public, unlisted or private)",
				"at: when to post, an RFC 3339 time with a time zone; leave out to post as soon as the video is ready",
				"job_id (required, unless video_from is given): the id of the video, normally ${step.ref} of the step that made it",
				"video_from: the id of the step that made the video, instead of job_id",
			},
			Outputs: []Output{{"post_id", KindID, "the id of the queued post"}},
			ValidateArgs: func(args map[string]any) error {
				_, err := ParsePostArgs(args)
				return err
			},
		},
		Tool{
			Name:         "get_job_status",
			Description:  "Read the status of a video job made by an earlier step.",
			ReadOnly:     true,
			Args:         jobStatus.docs,
			Outputs:      []Output{{"status", KindText, "the job's status"}, {"progress", KindNumber, "percent complete"}},
			ValidateArgs: jobStatus.validate,
		},
		Tool{
			Name:         "get_workflow_status",
			Description:  "Read the current status and step states of a workflow.",
			ReadOnly:     true,
			Args:         workflowStatus.docs,
			Outputs:      []Output{{"status", KindText, "the workflow's status"}},
			ValidateArgs: workflowStatus.validate,
		},
	)
}
