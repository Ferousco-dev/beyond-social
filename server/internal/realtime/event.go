package realtime

import (
	"encoding/json"
	"time"
)

// Event is the stable envelope for everything pushed to WebSocket clients.
type Event struct {
	Type       string          `json:"type"`
	ResourceID string          `json:"resource_id"`
	Timestamp  time.Time       `json:"timestamp"`
	Payload    json.RawMessage `json:"payload"`
}

// NewEvent marshals payload into an envelope stamped with the current time.
func NewEvent(eventType, resourceID string, payload any) (Event, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return Event{}, err
	}
	return Event{Type: eventType, ResourceID: resourceID, Timestamp: time.Now().UTC(), Payload: raw}, nil
}
