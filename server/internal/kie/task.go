package kie

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

func (c *Client) GetTask(ctx context.Context, taskID string) (Task, error) {
	var out struct {
		Code int    `json:"code"`
		Msg  string `json:"msg"`
		Data struct {
			TaskID     string `json:"taskId"`
			State      string `json:"state"`
			ResultJSON string `json:"resultJson"`
			FailCode   string `json:"failCode"`
			FailMsg    string `json:"failMsg"`
			Progress   int    `json:"progress"`
		} `json:"data"`
	}
	endpoint := c.apiBase + "/api/v1/jobs/recordInfo?taskId=" + url.QueryEscape(taskID)
	if err := c.do(ctx, http.MethodGet, endpoint, "", nil, &out); err != nil {
		return Task{}, err
	}
	if out.Code != 200 {
		return Task{}, classify(out.Code, out.Msg)
	}
	t := Task{ID: out.Data.TaskID, Progress: clamp(out.Data.Progress), FailCode: out.Data.FailCode, FailMsg: out.Data.FailMsg}
	switch out.Data.State {
	case "success":
		t.State = StateSuccess
		urls, err := parseResultURLs(out.Data.ResultJSON)
		if err != nil {
			// "success" without a usable result is not a success we can show.
			return Task{}, &provider.Error{Provider: providerName, Message: "success without result urls: " + err.Error()}
		}
		t.ResultURLs = urls
	case "fail":
		t.State = StateFailed
	case "waiting", "queuing", "generating":
		t.State = StatePending
	default:
		return Task{}, &provider.Error{Provider: providerName, Message: "unknown task state " + out.Data.State}
	}
	return t, nil
}

func parseResultURLs(raw string) ([]string, error) {
	var r struct {
		ResultURLs []string `json:"resultUrls"`
	}
	if err := json.Unmarshal([]byte(raw), &r); err != nil {
		return nil, err
	}
	var urls []string
	for _, u := range r.ResultURLs {
		if parsed, err := url.Parse(u); err == nil && parsed.Scheme == "https" && parsed.Host != "" {
			urls = append(urls, u)
		}
	}
	if len(urls) == 0 {
		return nil, fmt.Errorf("no https result url")
	}
	return urls, nil
}
