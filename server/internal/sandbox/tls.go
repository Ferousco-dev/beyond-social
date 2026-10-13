package sandbox

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/safenet"
)

// Certificate makes a self-signed certificate for the local addresses the
// sandbox is served on, and the PEM to hand to anything that must trust it.
func Certificate() (tls.Certificate, []byte, error) {
	pair, certPEM, _, err := newCertificate()
	return pair, certPEM, err
}

func newCertificate() (tls.Certificate, []byte, []byte, error) {
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return tls.Certificate{}, nil, nil, err
	}
	template := &x509.Certificate{
		SerialNumber:          big.NewInt(time.Now().UnixNano()),
		Subject:               pkix.Name{CommonName: "Beyond Social sandbox"},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().Add(30 * 24 * time.Hour),
		KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageCertSign,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		IsCA:                  true,
		DNSNames:              []string{"localhost"},
		IPAddresses:           []net.IP{net.ParseIP("127.0.0.1"), net.ParseIP("::1")},
	}
	der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	if err != nil {
		return tls.Certificate{}, nil, nil, err
	}
	keyDER, err := x509.MarshalECPrivateKey(key)
	if err != nil {
		return tls.Certificate{}, nil, nil, err
	}
	certPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
	keyPEM := pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyDER})
	pair, err := tls.X509KeyPair(certPEM, keyPEM)
	return pair, certPEM, keyPEM, err
}

// Pool turns a certificate PEM into a set of trusted roots.
func Pool(certPEM []byte) *x509.CertPool {
	pool := x509.NewCertPool()
	pool.AppendCertsFromPEM(certPEM)
	return pool
}

// Trust makes this process accept the sandbox's certificate, both for the
// address guard and for the clients that use the default transport, and lets
// the guard reach loopback addresses.
func Trust(certPEM []byte) {
	pool := Pool(certPEM)
	safenet.AllowSandbox(pool)
	if t, ok := http.DefaultTransport.(*http.Transport); ok {
		t.TLSClientConfig = &tls.Config{RootCAs: pool, MinVersion: tls.VersionTLS12}
	}
}

// CertificateIn reuses the certificate saved in dir, or makes and saves one, so
// the API only has to be told to trust it once. It returns the PEM too.
func CertificateIn(dir string) (tls.Certificate, []byte, error) {
	certPath, keyPath := filepath.Join(dir, "sandbox-cert.pem"), filepath.Join(dir, "sandbox-key.pem")
	if certPEM, err := os.ReadFile(certPath); err == nil {
		if keyPEM, err := os.ReadFile(keyPath); err == nil {
			if pair, err := tls.X509KeyPair(certPEM, keyPEM); err == nil && stillValid(pair) {
				return pair, certPEM, nil
			}
		}
	}
	pair, certPEM, keyPEM, err := newCertificate()
	if err != nil {
		return tls.Certificate{}, nil, err
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return tls.Certificate{}, nil, err
	}
	if err := os.WriteFile(certPath, certPEM, 0o644); err != nil {
		return tls.Certificate{}, nil, err
	}
	return pair, certPEM, os.WriteFile(keyPath, keyPEM, 0o600)
}

func stillValid(pair tls.Certificate) bool {
	leaf, err := x509.ParseCertificate(pair.Certificate[0])
	return err == nil && time.Until(leaf.NotAfter) > 24*time.Hour
}
