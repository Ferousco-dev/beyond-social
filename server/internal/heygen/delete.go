package heygen

import (
	"context"
	"net/http"
	"net/url"
)

// DeleteAvatarGroup permanently removes a character and all its looks. HeyGen
// keeps the source assets and cloned voices, which is why voices are deleted
// separately. Something already gone counts as deleted.
func (c *Client) DeleteAvatarGroup(ctx context.Context, groupID string) error {
	return c.deleteOK(ctx, "/avatars/"+url.PathEscape(groupID))
}

// DeleteVoice removes a cloned voice.
func (c *Client) DeleteVoice(ctx context.Context, voiceID string) error {
	return c.deleteOK(ctx, "/voices/"+url.PathEscape(voiceID))
}

func (c *Client) deleteOK(ctx context.Context, path string) error {
	var out struct{}
	err := c.do(ctx, http.MethodDelete, path, nil, nil, "", &out)
	if HTTPStatus(err) == http.StatusNotFound {
		return nil
	}
	return err
}
