// Command sandbox runs the stand-in for every outside service, for trying the
// product end to end with no keys and no outside requests. Development only.
package main

import (
	"crypto/tls"
	"flag"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/sandbox"
)

func main() {
	addr := flag.String("addr", "127.0.0.1:8443", "where to listen (https)")
	api := flag.String("api", "http://127.0.0.1:8080", "the product's API, which payment events are sent to")
	secret := flag.String("webhook-secret", "whsec_sandbox", "signs the payment events; paste the same value as the Stripe webhook secret")
	dir := flag.String("dir", ".dev-logs", "where the sandbox keeps its certificate")
	flag.Parse()

	pair, _, err := sandbox.CertificateIn(*dir)
	if err != nil {
		log.Fatal(err)
	}
	base := "https://" + *addr
	srv := &http.Server{
		Addr: *addr, Handler: sandbox.New(base, *api, *secret).Handler(), ReadHeaderTimeout: 5 * time.Second,
		TLSConfig: &tls.Config{Certificates: []tls.Certificate{pair}, MinVersion: tls.VersionTLS12},
	}
	fmt.Printf(`Sandbox running at %[1]s

Start the API with:
  SANDBOX_URL=%[1]s SANDBOX_CA_FILE=%[2]s ./bin/api

Then in the admin console paste any text for the provider keys, and
%[3]s as the Stripe webhook secret. Open %[1]s once in your browser and
accept its certificate so the sandbox's video previews can play.
`, base, filepath.Join(*dir, "sandbox-cert.pem"), *secret)
	log.Fatal(srv.ListenAndServeTLS("", ""))
}
