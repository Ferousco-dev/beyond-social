package credits

import (
	"context"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
)

type fakeSpendStore struct {
	costs map[string]float64
	saved []Spend
}

func (f *fakeSpendStore) UnitCost(_ context.Context, action string) (string, float64, bool, error) {
	c, ok := f.costs[action]
	return "kie", c, ok, nil
}

func (f *fakeSpendStore) RecordSpend(_ context.Context, s Spend) error {
	f.saved = append(f.saved, s)
	return nil
}

func recorder(costs map[string]float64) (*SpendRecorder, *fakeSpendStore) {
	store := &fakeSpendStore{costs: costs}
	return NewSpendRecorder(&JobBiller{}, store), store
}

func completed(jobType string, input map[string]any) jobs.Job {
	return jobs.Job{ID: "job-1", UserID: "user-1", Type: jobType, Status: jobs.StatusCompleted, Input: input}
}

func TestCompletedTransformRecordsOneUnitAtTheTableCost(t *testing.T) {
	r, store := recorder(map[string]float64{"video_transform:5:720p": 0.35})
	r.JobFinished(context.Background(), completed("video_transform", map[string]any{"duration": "5", "resolution": "720p"}))
	if len(store.saved) != 1 {
		t.Fatalf("want one record, got %d", len(store.saved))
	}
	s := store.saved[0]
	if s.JobID != "job-1" || s.UserID != "user-1" || s.Provider != "kie" || s.Units != 1 || s.CostUSD != 0.35 {
		t.Fatalf("wrong record: %+v", s)
	}
}

func TestGeneratedVideoCostScalesWithSecondsAndSound(t *testing.T) {
	r, store := recorder(map[string]float64{"video_generate_sound_second": 0.14})
	input := map[string]any{"sound": true, "scenes": []any{
		map[string]any{"prompt": "a", "seconds": float64(5)},
		map[string]any{"prompt": "b", "seconds": float64(3)},
	}}
	r.JobFinished(context.Background(), completed("video_generate", input))
	if len(store.saved) != 1 || store.saved[0].Units != 8 {
		t.Fatalf("want 8 seconds recorded, got %+v", store.saved)
	}
	if got := store.saved[0].CostUSD; got < 1.119 || got > 1.121 {
		t.Fatalf("8 seconds at 0.14 should cost 1.12, got %v", got)
	}
}

func TestFailedAndUnpricedJobsRecordNothing(t *testing.T) {
	r, store := recorder(map[string]float64{"video_transform:5:720p": 0.35})
	failed := completed("video_transform", map[string]any{"duration": "5", "resolution": "720p"})
	failed.Status = jobs.StatusFailed
	r.JobFinished(context.Background(), failed)
	r.JobFinished(context.Background(), completed("something_free", map[string]any{}))
	r.JobFinished(context.Background(), completed("video_transform", map[string]any{"duration": "9", "resolution": "4k"})) // no price row
	if len(store.saved) != 0 {
		t.Fatalf("nothing should be recorded, got %+v", store.saved)
	}
}

func TestChargingAndSpendAgreeOnWhatAJobIsPricedBy(t *testing.T) {
	b := &JobBiller{}
	action, units, err := b.quantity(completed("video_analysis", nil))
	if err != nil || action != "video_analysis" || units != 1 {
		t.Fatalf("analysis should be one video_analysis unit, got %q %d %v", action, units, err)
	}
	if action, units, _ := b.quantity(completed("not_a_job", nil)); action != "" || units != 0 {
		t.Fatalf("an unpriced type must have no action, got %q %d", action, units)
	}
}
