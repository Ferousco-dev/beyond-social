// Package sandbox is a stand-in for every outside service the product calls:
// video, avatars, trend scraping, payments, language models and the social
// platforms. It lets the whole product be tried end to end without keys, credits
// or any outside request. It exists for development only: delete this package,
// cmd/sandbox and the SANDBOX_URL block in cmd/api once testing is done.
package sandbox
