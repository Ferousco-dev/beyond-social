package safenet

import (
	"crypto/x509"
	"sync/atomic"
)

// This file exists only so the local sandbox can stand in for outside services.
// It is the single place the address guard can be relaxed, and the API refuses
// to start in production with it on (see cmd/api).
var (
	allowLoopback atomic.Bool
	sandboxRoots  atomic.Pointer[x509.CertPool]
)

// AllowSandbox lets fetches reach loopback addresses and trusts the sandbox's
// certificate. Never call it outside development.
func AllowSandbox(roots *x509.CertPool) {
	allowLoopback.Store(true)
	sandboxRoots.Store(roots)
}
