package kie

import (
	"context"
	"encoding/json"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

func testClient(t *testing.T, h http.HandlerFunc) *Client {
	t.Helper()
	srv := httptest.NewServer(h)
	t.Cleanup(srv.Close)
	return NewClient("secret-key").WithBaseURLs(srv.URL, srv.URL)
}

func TestCreateTaskRequestMatchesDocs(t *testing.T) {
	c := testClient(t, func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Model       string         `json:"model"`
			CallBackURL string         `json:"callBackUrl"`
			Input       map[string]any `json:"input"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		if r.URL.Path != "/api/v1/jobs/createTask" || r.Header.Get("Authorization") != "Bearer secret-key" {
			t.Errorf("unexpected request %s auth=%q", r.URL.Path, r.Header.Get("Authorization"))
		}
		urls, _ := body.Input["video_urls"].([]any)
		if body.Model != "wan/2-6-video-to-video" || body.Input["prompt"] != "make it neon" || body.Input["resolution"] != "720p" ||
			body.Input["duration"] != "5" || len(urls) != 1 || urls[0] != "https://f/v.mp4" || body.CallBackURL != "https://app/cb" {
			t.Errorf("unexpected body %+v", body)
		}
		_, _ = w.Write([]byte(`{"code":200,"msg":"success","data":{"taskId":"task_1"}}`))
	})
	id, err := c.CreateTask(context.Background(), TaskRequest{Prompt: "make it neon", VideoURL: "https://f/v.mp4", Duration: "5", Resolution: "720p", CallbackURL: "https://app/cb"})
	if err != nil || id != "task_1" {
		t.Fatalf("%q %v", id, err)
	}
}

func TestCreateTaskOmitsCallbackWhenUnset(t *testing.T) {
	c := testClient(t, func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		var m map[string]any
		_ = json.Unmarshal(b, &m)
		if _, ok := m["callBackUrl"]; ok {
			t.Error("callBackUrl must be omitted when not configured")
		}
		_, _ = w.Write([]byte(`{"code":200,"data":{"taskId":"t"}}`))
	})
	if _, err := c.CreateTask(context.Background(), TaskRequest{Prompt: "pp", VideoURL: "https://f/v.mp4", Duration: "5", Resolution: "720p"}); err != nil {
		t.Fatal(err)
	}
}

func TestInBodyErrorCodesAreClassified(t *testing.T) {
	for code, transient := range map[int]bool{500: true, 429: true, 402: false, 401: false, 422: false, 501: true} {
		c := testClient(t, func(w http.ResponseWriter, _ *http.Request) {
			_, _ = w.Write([]byte(`{"code":` + itoa(code) + `,"msg":"internal detail","data":null}`))
		})
		_, err := c.CreateTask(context.Background(), TaskRequest{})
		if err == nil || provider.IsTransient(err) != transient {
			t.Errorf("code %d: transient=%v err=%v", code, provider.IsTransient(err), err)
		}
	}
}

func itoa(n int) string { b, _ := json.Marshal(n); return string(b) }

func TestGetTaskStates(t *testing.T) {
	cases := map[string]struct {
		body  string
		state State
		urls  int
		fail  bool
	}{
		"generating":            {`{"code":200,"data":{"taskId":"t","state":"generating","progress":40}}`, StatePending, 0, false},
		"waiting":               {`{"code":200,"data":{"taskId":"t","state":"waiting"}}`, StatePending, 0, false},
		"success":               {`{"code":200,"data":{"taskId":"t","state":"success","resultJson":"{\"resultUrls\":[\"https://cdn/out.mp4\"]}"}}`, StateSuccess, 1, false},
		"fail":                  {`{"code":200,"data":{"taskId":"t","state":"fail","failCode":"500","failMsg":"nsfw"}}`, StateFailed, 0, false},
		"success but no urls":   {`{"code":200,"data":{"taskId":"t","state":"success","resultJson":"{\"resultUrls\":[]}"}}`, "", 0, true},
		"success http url only": {`{"code":200,"data":{"taskId":"t","state":"success","resultJson":"{\"resultUrls\":[\"http://x/o.mp4\"]}"}}`, "", 0, true},
		"success bad json":      {`{"code":200,"data":{"taskId":"t","state":"success","resultJson":"not json"}}`, "", 0, true},
		"unknown state":         {`{"code":200,"data":{"taskId":"t","state":"weird"}}`, "", 0, true},
		"lookup error":          {`{"code":404,"msg":"no task"}`, "", 0, true},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			c := testClient(t, func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path != "/api/v1/jobs/recordInfo" || r.URL.Query().Get("taskId") != "t" {
					t.Errorf("unexpected %s", r.URL.String())
				}
				_, _ = w.Write([]byte(tc.body))
			})
			task, err := c.GetTask(context.Background(), "t")
			if tc.fail {
				if err == nil {
					t.Fatalf("expected error, got %+v", task)
				}
				return
			}
			if err != nil || task.State != tc.state || len(task.ResultURLs) != tc.urls {
				t.Fatalf("%+v %v", task, err)
			}
		})
	}
}

func TestUploadSendsMultipartAndReturnsDownloadURL(t *testing.T) {
	c := testClient(t, func(w http.ResponseWriter, r *http.Request) {
		mt, params, _ := mime.ParseMediaType(r.Header.Get("Content-Type"))
		if r.URL.Path != "/api/file-stream-upload" || mt != "multipart/form-data" {
			t.Errorf("unexpected upload request %s %s", r.URL.Path, mt)
		}
		form, err := multipart.NewReader(r.Body, params["boundary"]).ReadForm(1 << 20)
		if err != nil || form.Value["uploadPath"][0] == "" || len(form.File["file"]) != 1 {
			t.Errorf("bad form: %v", err)
		}
		_, _ = w.Write([]byte(`{"success":true,"code":200,"data":{"downloadUrl":"https://tempfile.kie/x.mp4"}}`))
	})
	u, err := c.Upload(context.Background(), "x.mp4", "video/mp4", []byte("data"))
	if err != nil || u != "https://tempfile.kie/x.mp4" {
		t.Fatalf("%q %v", u, err)
	}
}

func TestUploadRejectsInsecureOrFailedResponses(t *testing.T) {
	for _, body := range []string{
		`{"success":true,"code":200,"data":{"downloadUrl":"http://insecure/x.mp4"}}`,
		`{"success":false,"code":500,"msg":"boom"}`,
	} {
		c := testClient(t, func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte(body)) })
		if _, err := c.Upload(context.Background(), "x.mp4", "video/mp4", []byte("d")); err == nil {
			t.Errorf("expected failure for %s", body)
		}
	}
}

func TestClientTimeoutIsTransient(t *testing.T) {
	c := testClient(t, func(w http.ResponseWriter, r *http.Request) { <-r.Context().Done() })
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	if _, err := c.GetTask(ctx, "t"); !provider.IsTransient(err) {
		t.Fatalf("got %v", err)
	}
}

func TestVerifyCallback(t *testing.T) {
	now := time.Now()
	ts := itoa(int(now.Unix()))
	sig := SignCallback("hmac-key", "task_1", ts)

	if err := VerifyCallback("hmac-key", "task_1", ts, sig, now); err != nil {
		t.Fatalf("valid signature rejected: %v", err)
	}
	for name, err := range map[string]error{
		"wrong key":    VerifyCallback("other", "task_1", ts, sig, now),
		"wrong task":   VerifyCallback("hmac-key", "task_2", ts, sig, now),
		"tampered sig": VerifyCallback("hmac-key", "task_1", ts, sig+"A", now),
		"empty sig":    VerifyCallback("hmac-key", "task_1", ts, "", now),
		"bad ts":       VerifyCallback("hmac-key", "task_1", "abc", sig, now),
		"stale":        VerifyCallback("hmac-key", "task_1", ts, sig, now.Add(time.Hour)),
		"future":       VerifyCallback("hmac-key", "task_1", ts, sig, now.Add(-time.Hour)),
	} {
		if err == nil {
			t.Errorf("%s: expected rejection", name)
		}
	}
}

func TestCallbackTaskID(t *testing.T) {
	if id, err := CallbackTaskID([]byte(`{"code":200,"data":{"taskId":"abc","state":"success"}}`)); err != nil || id != "abc" {
		t.Fatalf("%q %v", id, err)
	}
	for _, bad := range []string{``, `{}`, `{"data":{}}`, `nope`} {
		if _, err := CallbackTaskID([]byte(bad)); err == nil {
			t.Errorf("%q should fail", bad)
		}
	}
}
