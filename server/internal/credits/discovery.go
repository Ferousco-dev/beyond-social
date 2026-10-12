package credits

import "context"

// ActionDiscoverySearch is the price row for one search.
const ActionDiscoverySearch = "discovery_search"

// DiscoveryBiller charges for searches. It implements discovery.Biller.
type DiscoveryBiller struct {
	svc *Service
}

func NewDiscoveryBiller(svc *Service) *DiscoveryBiller { return &DiscoveryBiller{svc: svc} }

func (b *DiscoveryBiller) Reserve(ctx context.Context, userID, discoveryID string) error {
	amount, err := b.svc.Quote(ctx, ActionDiscoverySearch)
	if err != nil {
		return err
	}
	return b.svc.Reserve(ctx, userID, discoveryID, amount, ActionDiscoverySearch)
}

func (b *DiscoveryBiller) Close(ctx context.Context, userID, discoveryID string, delivered bool) error {
	if delivered {
		reserved, err := b.svc.store.Reserved(ctx, discoveryID)
		if err != nil {
			return err
		}
		return b.svc.Settle(ctx, userID, discoveryID, reserved)
	}
	return b.svc.Refund(ctx, userID, discoveryID, "search failed")
}
