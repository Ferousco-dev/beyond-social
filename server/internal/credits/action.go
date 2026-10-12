package credits

import "context"

// Actions charged one flat price per resource.
const (
	ActionDiscoverySearch = "discovery_search"
	ActionAvatarTraining  = "avatar_training"
)

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
		reserved, err := b.svc.store.Reserved(ctx, discoveryID)
		if err != nil {
			return err
		}
		return b.svc.Settle(ctx, userID, discoveryID, reserved)
	}
	return b.svc.Refund(ctx, userID, discoveryID, "did not complete")
}
