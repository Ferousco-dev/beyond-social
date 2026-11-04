package kietools

import (
	"context"
	"encoding/binary"
	"errors"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/assetlib"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
)

type countingJobs struct {
	active  int
	created []map[string]any
	keys    []string
	failAt  int
}

func (f *countingJobs) Create(_ context.Context, _, _ string, input map[string]any, key string) (jobs.Job, bool, error) {
	if f.failAt > 0 && len(f.created)+1 == f.failAt {
		return jobs.Job{}, false, errors.New("out of credits")
	}
	f.created = append(f.created, input)
	f.keys = append(f.keys, key)
	return jobs.Job{ID: key}, true, nil
}

func (f *countingJobs) CountActive(context.Context, string, string) (int, error) {
	return f.active, nil
}

type library map[string]assetlib.Asset

func (l library) Usable(_ context.Context, _, id string, kind assetlib.Kind) (assetlib.Asset, error) {
	asset, ok := l[id]
	if !ok {
		return assetlib.Asset{}, assetlib.ErrNotFound
	}
	if asset.Kind != kind || asset.ConsentAt == nil {
		return assetlib.Asset{}, assetlib.ErrInvalid
	}
	return asset, nil
}

// oneSecondWAV is a valid one-second WAV, so the service reads the recording's
// length from its headers the way it does for real voice files.
func oneSecondWAV() []byte {
	const byteRate = 16_000
	data := make([]byte, byteRate)
	out := make([]byte, 44, 44+len(data))
	copy(out[0:], "RIFF")
	binary.LittleEndian.PutUint32(out[4:], uint32(36+len(data)))
	copy(out[8:], "WAVE")
	copy(out[12:], "fmt ")
	binary.LittleEndian.PutUint32(out[16:], 16)
	binary.LittleEndian.PutUint16(out[20:], 1)
	binary.LittleEndian.PutUint16(out[22:], 1)
	binary.LittleEndian.PutUint32(out[24:], 8_000)
	binary.LittleEndian.PutUint32(out[28:], byteRate)
	binary.LittleEndian.PutUint16(out[32:], 2)
	binary.LittleEndian.PutUint16(out[34:], 16)
	copy(out[36:], "data")
	binary.LittleEndian.PutUint32(out[40:], uint32(len(data)))
	return append(out, data...)
}

type recordings struct{}

func (recordings) Load(context.Context, string, string, int64) ([]byte, string, error) {
	return oneSecondWAV(), "audio/wav", nil
}

func newConversation(j *countingJobs) *LiveAvatarService {
	now := time.Now()
	return NewLiveAvatarService(j, nil, library{
		"ada":        {Kind: assetlib.KindFace, MediaID: "ada.png", FileKind: "image", ConsentAt: &now},
		"ben":        {Kind: assetlib.KindFace, MediaID: "ben.png", FileKind: "image", ConsentAt: &now},
		"ada-voice":  {Kind: assetlib.KindVoice, MediaID: "ada.mp3", FileKind: "audio", ConsentAt: &now},
		"ben-voice":  {Kind: assetlib.KindVoice, MediaID: "ben.mp3", FileKind: "audio", ConsentAt: &now},
		"no-consent": {Kind: assetlib.KindFace, MediaID: "x.png", FileKind: "image"},
	}, recordings{})
}

var twoTurns = []Turn{{"ada", "ada-voice", "Hi Ben."}, {"ben", "ben-voice", "Hi Ada."}}

func TestAConversationStartsOneVideoPerTurnInOrder(t *testing.T) {
	j := &countingJobs{active: 2}
	started, err := newConversation(j).SubmitConversation(t.Context(), "u", twoTurns, "Cafe", "request-key")
	if err != nil || len(started) != 2 {
		t.Fatalf("started %d: %v", len(started), err)
	}
	if j.created[0]["face_media_id"] != "ada.png" || j.created[1]["voice_media_id"] != "ben.mp3" || j.created[1]["turn"] != 2 {
		t.Fatalf("turns out of order: %+v", j.created)
	}
	if j.keys[0] != "request-key:turn-1" || j.keys[1] != "request-key:turn-2" {
		t.Fatalf("each turn needs its own retry key: %v", j.keys)
	}
}

func TestEveryTurnIsCheckedBeforeAnyVideoStarts(t *testing.T) {
	for name, turns := range map[string][]Turn{
		"one turn":       twoTurns[:1],
		"seven turns":    {twoTurns[0], twoTurns[1], twoTurns[0], twoTurns[1], twoTurns[0], twoTurns[1], twoTurns[0]},
		"no consent":     {twoTurns[0], {"no-consent", "ben-voice", "Hi."}},
		"voice as face":  {twoTurns[0], {"ben-voice", "ben-voice", "Hi."}},
		"missing words":  {twoTurns[0], {"ben", "ben-voice", "  "}},
		"someone else's": {twoTurns[0], {"stranger", "ben-voice", "Hi."}},
	} {
		j := &countingJobs{}
		if _, err := newConversation(j).SubmitConversation(t.Context(), "u", turns, "", "request-key"); !errors.Is(err, ErrInvalid) {
			t.Errorf("%s: err = %v", name, err)
		}
		if len(j.created) != 0 {
			t.Errorf("%s: %d videos started before the check failed", name, len(j.created))
		}
	}
}

func TestABusyAccountWaitsAndAPartialStartIsReported(t *testing.T) {
	if _, err := newConversation(&countingJobs{active: maxActivePerUser}).SubmitConversation(t.Context(), "u", twoTurns, "", "request-key"); !errors.Is(err, ErrTooManyBusy) {
		t.Fatalf("busy: %v", err)
	}
	started, err := newConversation(&countingJobs{failAt: 2}).SubmitConversation(t.Context(), "u", twoTurns, "", "request-key")
	if err == nil || len(started) != 1 {
		t.Fatalf("partial: %d started, err %v", len(started), err)
	}
}
