package httpserver

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthHandler(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	res := httptest.NewRecorder()

	HealthHandler(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.Code)
	}
}

func TestReadyHandler(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	res := httptest.NewRecorder()

	ReadyHandler(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.Code)
	}
}
