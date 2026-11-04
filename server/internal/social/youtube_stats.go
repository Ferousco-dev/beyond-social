package social

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

// Stats is one video's public counters. Platforms that do not expose them
// report ErrStatsUnsupported instead of invented zeros.
type Stats struct {
	Views    int64
	Likes    int64
	Comments int64
}

var ErrStatsUnsupported = &provider.Error{Provider: "social", Message: "this platform does not share metrics"}

// VideoStats reads a YouTube video's public counters. The existing OAuth
// scopes already include youtube.readonly, so no reconsent is needed.
func (p *YouTubeProvider) VideoStats(ctx context.Context, access, videoID string) (Stats, error) {
	return p.videoStats(ctx, "https://www.googleapis.com/youtube/v3/videos", access, videoID)
}

func (p *YouTubeProvider) videoStats(ctx context.Context, base, access, videoID string) (Stats, error) {
	endpoint := base + "?part=statistics&id=" + videoID
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return Stats{}, err
	}
	req.Header.Set("Authorization", "Bearer "+access)
	resp, err := p.http.Do(req)
	if err != nil {
		return Stats{}, &provider.Error{Provider: "youtube", Message: "could not reach YouTube", Transient: true, Err: err}
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode >= 300 {
		return Stats{}, provider.FromHTTPStatus("youtube", resp.StatusCode, "reading video statistics")
	}
	var out struct {
		Items []struct {
			Statistics map[string]string `json:"statistics"`
		} `json:"items"`
	}
	if err := json.Unmarshal(body, &out); err != nil || len(out.Items) == 0 {
		return Stats{}, &provider.Error{Provider: "youtube", Message: "that video has no statistics"}
	}
	counters := out.Items[0].Statistics
	return Stats{
		Views:    atoi(counters["viewCount"]),
		Likes:    atoi(counters["likeCount"]),
		Comments: atoi(counters["commentCount"]),
	}, nil
}

func atoi(raw string) int64 {
	n, _ := strconv.ParseInt(raw, 10, 64)
	return n
}
