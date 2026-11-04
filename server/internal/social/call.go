package social

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

// call sends a request and decodes a JSON answer into out (nil ignores it). A
// network failure is transient, a refusal carries the status, and neither puts
// a provider's raw reply text in the error: it may echo secrets or be long.
func call(c *http.Client, req *http.Request, name string, out any) error {
	resp, err := c.Do(req)
	if err != nil {
		return &provider.Error{Provider: name, Message: "could not reach " + name, Transient: true, Err: err}
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode >= 300 {
		return provider.FromHTTPStatus(name, resp.StatusCode, fmt.Sprintf("request refused (%d)", resp.StatusCode))
	}
	if out == nil {
		return nil
	}
	if err := json.Unmarshal(body, out); err != nil {
		return &provider.Error{Provider: name, Message: "unreadable response from " + name}
	}
	return nil
}

// asProvider unwraps a provider error.
func asProvider(err error, target **provider.Error) bool { return errors.As(err, target) }
