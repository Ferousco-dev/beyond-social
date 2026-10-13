package orchestrator

import (
	"context"
	"errors"

	"github.com/Ferousco-dev/beyond-social/server/internal/kietools"
)

// How a step is carried out. A tool is described once in the registry, and a
// Runner says what actually happens when a plan reaches it, so adding a tool
// never means touching the engine.
type (
	// InlineFunc does the whole step in one call and returns its output.
	InlineFunc func(ctx context.Context, workflow Workflow, step *Step) (map[string]any, error)
	// SubmitFunc starts work that outlives one pass and returns the id of the
	// record that follows it. The key is stable per step, so a retry that
	// repeats the call can never spend twice.
	SubmitFunc func(ctx context.Context, workflow Workflow, step *Step, key string) (ref string, output map[string]any, err error)
	// ReconcileFunc reads that record. It reports done with the step's output,
	// or fail when the work ended badly, or err when it could not tell yet.
	ReconcileFunc func(ctx context.Context, workflow Workflow, step *Step, ref string) (done bool, output map[string]any, fail, err error)
)

// Runner carries out one tool. Set Inline for quick work, or Submit and
// Reconcile for work that runs in the background.
type Runner struct {
	Inline    InlineFunc
	Submit    SubmitFunc
	Reconcile ReconcileFunc
}

func (r Runner) valid() bool { return r.Inline != nil || (r.Submit != nil && r.Reconcile != nil) }

// Handle sets how a tool's steps are carried out. Call it while wiring the
// service, before the engine starts. A tool with no runner is taken out of use by Seal.
func (s *Service) Handle(tool string, r Runner) error {
	if !s.deps.Registry.Registered(tool) {
		return errors.New("orchestrator: no such tool: " + tool)
	}
	if !r.valid() {
		return errors.New("orchestrator: a runner needs Inline, or both Submit and Reconcile: " + tool)
	}
	s.runners[tool] = r
	return nil
}

// Seal ends the wiring. Every tool without a runner is taken out of use, so a
// plan can never name something that cannot run. Call it once, after the last Handle.
func (s *Service) Seal() {
	for _, name := range s.deps.Registry.Names() {
		if _, ok := s.runners[name]; !ok {
			s.deps.Registry.Disable(name)
		}
	}
}

// wireBuiltIn sets up the tools that ship with the product. A tool whose
// provider is not connected simply gets no runner.
func (s *Service) wireBuiltIn() {
	d := s.deps
	set := func(tool string, r Runner) {
		// A registry without this tool is a smaller product, not a mistake.
		if d.Registry.Registered(tool) {
			if err := s.Handle(tool, r); err != nil {
				panic(err) // a built-in runner that is not valid is a bug in this file
			}
		}
	}
	set("get_job_status", Runner{Inline: func(ctx context.Context, w Workflow, step *Step) (map[string]any, error) {
		return s.readJob(ctx, w.UserID, step)
	}})
	set("get_workflow_status", Runner{Inline: func(ctx context.Context, w Workflow, step *Step) (map[string]any, error) {
		return s.readWorkflow(ctx, w.UserID, step)
	}})
	set("discover_videos", Runner{Submit: s.submitDiscovery, Reconcile: s.reconcileDiscovery})
	set("transform_video", Runner{Submit: s.submitTransform, Reconcile: s.reconcileJob})
	set("create_avatar_video", Runner{Submit: s.submitAvatarVideo, Reconcile: s.reconcileJob})
	if d.Generate != nil {
		set("generate_video", Runner{Submit: s.submitGenerate, Reconcile: s.reconcileJob})
	}
	if d.Media != nil {
		set("edit_image", Runner{Submit: s.submitMedia(kietools.JobEdit), Reconcile: s.reconcileJob})
		set("talking_photo", Runner{Submit: s.submitMedia(kietools.JobTalk), Reconcile: s.reconcileJob})
		set("speak_text", Runner{Submit: s.submitMedia(kietools.JobSpeech), Reconcile: s.reconcileJob})
	}
	if d.Scripts != nil {
		set("check_script", Runner{Inline: s.checkScript})
	}
	if d.Posts != nil {
		set("schedule_post", Runner{Inline: s.schedulePost})
	}
}
