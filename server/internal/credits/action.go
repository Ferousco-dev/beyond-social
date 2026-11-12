package credits

import "context"

// Actions charged one flat price per resource.
const (
	ActionDiscoverySearch = "discovery_search"
	// ActionTalkingSecond prices a second of lip-synced talking video.
	ActionTalkingSecond  = "talking_photo_second"
	ActionEditorAssist   = "editor_assist"
	ActionEditorCaptions = "editor_captions"
	ActionEditorWatch    = "editor_watch"
	ActionChatMessage    = "chat_message"
)

// VideoAction is the priced action for a generated clip: speech and ambience cost the
// provider more per second, so a clip with sound has its own price.
func VideoAction(sound bool) string {
	if sound {
		return "video_generate_sound_second"
	}
	return "video_generate_second"
}

// ActionBiller charges a flat price for a resource that has its own table
// (a search, an avatar). It implements the Biller interface those packages
// define: reserve when it is accepted, settle when it delivers, refund when not.
type ActionBiller struct {
	svc    *Service
	action string
}

func NewActionBiller(svc *Service, action string) *ActionBiller {
	return &ActionBiller{svc: svc, action: action}
}

func (b *ActionBiller) Reserve(ctx context.Context, userID, discoveryID string) error {
	amount, err := b.svc.Quote(ctx, b.action)
	if err != nil {
		return err
	}
	return b.svc.Reserve(ctx, userID, discoveryID, amount, b.action)
}

func (b *ActionBiller) Close(ctx context.Context, userID, discoveryID string, delivered bool) error {
	if delivered {
		return b.svc.Keep(ctx, userID, discoveryID)
	}
	return b.svc.Refund(ctx, userID, discoveryID, "did not complete")
}
