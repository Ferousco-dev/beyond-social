package kie

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strconv"
	"time"
)

var (
	ErrBadSignature = errors.New("callback signature is invalid")
	ErrStale        = errors.New("callback timestamp is outside the allowed window")
)

const callbackTolerance = 10 * time.Minute

// VerifyCallback checks KIE's documented webhook signature:
// base64(HMAC-SHA256(key, taskID + "." + timestampSeconds)), compared in
// constant time, with a bounded timestamp window to limit replays.
func VerifyCallback(key, taskID, timestamp, signature string, now time.Time) error {
	secs, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return ErrBadSignature
	}
	if d := now.Sub(time.Unix(secs, 0)); d > callbackTolerance || d < -callbackTolerance {
		return ErrStale
	}
	mac := hmac.New(sha256.New, []byte(key))
	mac.Write([]byte(taskID + "." + timestamp))
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(signature)) {
		return ErrBadSignature
	}
	return nil
}

// SignCallback produces the signature KIE would send. Used by tests.
func SignCallback(key, taskID, timestamp string) string {
	mac := hmac.New(sha256.New, []byte(key))
	mac.Write([]byte(taskID + "." + timestamp))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

// CallbackTaskID extracts the task ID from a callback body. Nothing else in
// the payload is trusted: the caller looks the task up through the API.
func CallbackTaskID(body []byte) (string, error) {
	var p struct {
		Data struct {
			TaskID string `json:"taskId"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &p); err != nil || p.Data.TaskID == "" {
		return "", errors.New("callback has no task id")
	}
	return p.Data.TaskID, nil
}
