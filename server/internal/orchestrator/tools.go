package orchestrator

import (
	"fmt"
	"strings"

	"github.com/Ferousco-dev/beyond-social/server/internal/generate"
	"google.golang.org/genai"
)

// Tool describes one backend-controlled capability Gemini may select. The
// executor is wired separately; the registry alone decides what a plan may
// name. Anything not registered here is rejected at validation time.
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
	// ValidateArgs rejects malformed or out-of-range arguments.
	ValidateArgs func(args map[string]any) error
}

// Registry is the closed set of tools plans may reference.
type Registry struct {
	tools map[string]Tool
}

// DefaultRegistry exposes only capabilities already implemented and verified
// in previous phases: Apify discovery, KIE transforms, HeyGen avatar videos,
// and read-only status lookups.
func DefaultRegistry() *Registry {
	tools := []Tool{
		{
			Name:        "discover_videos",
			Description: "Search TikTok or Instagram for videos, or resolve a direct video URL via Apify.",
			Billable:    true,
			ValidateArgs: validateObject(map[string]argRule{
				"platform": {required: true, oneOf: []string{"tiktok", "instagram"}},
				"query":    {maxRunes: 300},
				"url":      {maxRunes: 2000},
				"limit":    {minInt: 1, maxInt: 20},
			}, "platform"),
		},
		{
			Name:        "transform_video",
			Description: "Transform a discovered video with a text prompt via KIE AI.",
			Billable:    true,
			ValidateArgs: validateObject(map[string]argRule{
				"video_id": {required: true, maxRunes: 64},
				"prompt":   {required: true, minRunes: 1, maxRunes: 2000},
			}, "video_id", "prompt"),
		},
		{
			Name:        "create_avatar_video",
			Description: "Generate a video of a trained HeyGen avatar speaking a script.",
			Billable:    true,
			ValidateArgs: validateObject(map[string]argRule{
				"avatar_id": {required: true, maxRunes: 64},
				"script":    {required: true, minRunes: 1, maxRunes: 2000},
			}, "avatar_id", "script"),
		},
		{
			Name:        "generate_video",
			Description: "Make a new video clip of up to 15 seconds from scene descriptions, optionally starting from a picture the user attached, with Kling. Args: scenes (a list of {prompt, seconds}), optional image_media_id, aspect_ratio, sound.",
			Billable:    true,
			ValidateArgs: func(args map[string]any) error {
				_, err := generate.ParseArgs(args)
				return err
			},
		},
		{
			Name:        "schedule_post",
			Description: "Post a finished video to one of the user's connected accounts (youtube, tiktok or instagram), now or at a chosen time. Args: platform, caption, optional title, visibility and at (an RFC 3339 time), and video_from (the id of the step that made the video) or job_id.",
			Public:      true,
			ValidateArgs: func(args map[string]any) error {
				_, err := ParsePostArgs(args)
				return err
			},
		},
		{
			Name:        "get_job_status",
			Description: "Read the status of a video job created by an earlier step.",
			ReadOnly:    true,
			ValidateArgs: validateObject(map[string]argRule{
				"job_id": {required: true, maxRunes: 64},
			}, "job_id"),
		},
		{
			Name:        "get_workflow_status",
			Description: "Read the current status and step states of a workflow.",
			ReadOnly:    true,
			ValidateArgs: validateObject(map[string]argRule{
				"workflow_id": {required: true, maxRunes: 64},
			}, "workflow_id"),
		},
	}
	r := &Registry{tools: make(map[string]Tool, len(tools))}
	for _, tool := range tools {
		r.tools[tool.Name] = tool
	}
	return r
}

// Get returns the tool and whether it is registered.
func (r *Registry) Get(name string) (Tool, bool) {
	tool, ok := r.tools[name]
	return tool, ok
}

// Names lists registered tool names for prompts and response schemas.
func (r *Registry) Names() []string {
	names := make([]string, 0, len(r.tools))
	for name := range r.tools {
		names = append(names, name)
	}
	return names
}

// PlanResponseSchema constrains Gemini to the plan shape and the registered
// tool names. Schema enforcement is a backstop; Go validation is authoritative.
func (r *Registry) PlanResponseSchema() *genai.Schema {
	str := func(desc string, maxRunes int64) *genai.Schema {
		return &genai.Schema{Type: genai.TypeString, Description: desc, MaxLength: &maxRunes}
	}
	strList := func(desc string) *genai.Schema {
		return &genai.Schema{Type: genai.TypeArray, Description: desc, Items: &genai.Schema{Type: genai.TypeString}}
	}
	return &genai.Schema{
		Type: genai.TypeObject,
		Properties: map[string]*genai.Schema{
			"version":      {Type: genai.TypeInteger, Description: "Always 1."},
			"objective":    str("The user's objective in one sentence.", 500),
			"missing_info": strList("Questions for the user when essential inputs are missing. Empty when the plan is executable."),
			"unsupported":  strList("Requested actions no registered tool can perform. Empty when everything is covered."),
			"steps": {
				Type:        genai.TypeArray,
				Description: "Ordered workflow steps. Empty when clarification is needed.",
				MaxItems:    func() *int64 { n := int64(MaxSteps); return &n }(),
				Items: &genai.Schema{
					Type: genai.TypeObject,
					Properties: map[string]*genai.Schema{
						"id":      str("Unique step id, lowercase letters, digits, dash, underscore.", 32),
						"tool":    {Type: genai.TypeString, Format: "enum", Enum: r.Names(), Description: "One registered tool."},
						"args":    {Type: genai.TypeObject, Description: "Tool arguments. No other tools, URLs, code, or SQL."},
						"needs":   strList("Ids of steps that must complete first."),
						"confirm": {Type: genai.TypeBoolean, Description: "True when this step needs explicit user approval."},
					},
				},
			},
		},
	}
}

type argRule struct {
	required bool
	minRunes int
	maxRunes int
	minInt   int64
	maxInt   int64
	oneOf    []string
}

// validateObject builds an arg validator: required presence, string length
// bounds, integer ranges, fixed vocabularies, and no unknown fields. Unknown
// fields are rejected so a plan cannot smuggle instructions past review.
func validateObject(rules map[string]argRule, required ...string) func(map[string]any) error {
	return func(args map[string]any) error {
		for name := range args {
			if _, ok := rules[name]; !ok {
				return fmt.Errorf("unknown argument %q", name)
			}
		}
		for _, name := range required {
			value, ok := args[name]
			if !ok || value == nil {
				return fmt.Errorf("missing required argument %q", name)
			}
			if s, isStr := value.(string); isStr && strings.TrimSpace(s) == "" {
				return fmt.Errorf("missing required argument %q", name)
			}
		}
		for name, rule := range rules {
			value, ok := args[name]
			if !ok || value == nil {
				continue
			}
			switch v := value.(type) {
			case string:
				runes := len([]rune(v))
				if rule.minRunes > 0 && runes < rule.minRunes {
					return fmt.Errorf("argument %q too short", name)
				}
				if rule.maxRunes > 0 && runes > rule.maxRunes {
					return fmt.Errorf("argument %q too long", name)
				}
				if len(rule.oneOf) > 0 {
					allowed := false
					for _, option := range rule.oneOf {
						if v == option {
							allowed = true
							break
						}
					}
					if !allowed {
						return fmt.Errorf("argument %q has unsupported value", name)
					}
				}
			case float64:
				if rule.minInt != 0 && int64(v) < rule.minInt {
					return fmt.Errorf("argument %q below minimum", name)
				}
				if rule.maxInt != 0 && int64(v) > rule.maxInt {
					return fmt.Errorf("argument %q above maximum", name)
				}
			default:
				return fmt.Errorf("argument %q has unsupported type", name)
			}
		}
		return nil
	}
}
