package chat

import (
	"context"
	"fmt"
	"strings"

	"github.com/Ferousco-dev/beyond-social/server/internal/analysis"
	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
)

// maxInlineBytes is the most pictures and audio that travel to the model in one
// request, matching what Gemini accepts inline.
const maxInlineBytes = analysis.MaxInlineBytes

func (s *Service) resolveAttachments(ctx context.Context, userID string, ids []string) ([]media.Item, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	if s.files == nil {
		return nil, ErrInvalid
	}
	return s.files.Resolve(ctx, userID, ids)
}

func descriptors(items []media.Item) []media.Descriptor {
	if len(items) == 0 {
		return nil
	}
	out := make([]media.Descriptor, len(items))
	for i, item := range items {
		out[i] = item.Descriptor()
	}
	return out
}

func firstOfKind(items []media.Item, kind media.Kind) (media.Item, bool) {
	for _, item := range items {
		if item.Kind == kind {
			return item, true
		}
	}
	return media.Item{}, false
}

// attachedSummary stands in for text when someone sends only a file.
func attachedSummary(items []media.Item) string {
	parts := make([]string, len(items))
	for i, item := range items {
		parts[i] = string(item.Kind) + " " + item.Name
	}
	return "Attached: " + strings.Join(parts, ", ")
}

// attachmentNote tells the model what an earlier message carried.
func attachmentNote(ds []media.Descriptor) string {
	if len(ds) == 0 {
		return ""
	}
	parts := make([]string, len(ds))
	for i, d := range ds {
		parts[i] = fmt.Sprintf("%s %q", d.Kind, d.Name)
	}
	return " [attached: " + strings.Join(parts, ", ") + "]"
}

// readableFiles loads the pictures and audio of this message for the model.
// Video is analysed by a background job instead and is not sent here.
func (s *Service) readableFiles(ctx context.Context, userID string, items []media.Item) ([]gemini.Media, error) {
	var files []gemini.Media
	var total int64
	for _, item := range items {
		if item.Kind == media.KindVideo {
			continue
		}
		total += item.Size
		if total > maxInlineBytes {
			return nil, media.ErrTooLarge
		}
		data, mime, err := s.files.Load(ctx, userID, item.ID, maxInlineBytes)
		if err != nil {
			return nil, err
		}
		files = append(files, gemini.Media{Data: data, MIME: mime})
	}
	return files, nil
}

// sendVideo answers a message carrying a video file by starting an analysis.
func (s *Service) sendVideo(ctx context.Context, userID string, conv Conversation, user Message, item media.Item) (Exchange, error) {
	job, _, err := s.analyzer.StartMedia(ctx, userID, item.ID, conv.ID, "analysis:"+user.ID)
	if err != nil {
		return Exchange{}, mapAnalysisError(err)
	}
	return s.postWatching(ctx, userID, conv, user, job.ID)
}
