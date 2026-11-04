package analysis

import "strings"

// Bounds on a suggested audience, so the form can offer it as options.
const (
	maxInterests = 6
	maxInterest  = 40
	minAge       = 13
	maxAge       = 65
)

// Audience is who the video seems made for. It is a suggestion the person
// edits before use, so it is the one part of a result that is inferred.
type Audience struct {
	Gender    string   `json:"gender"`
	AgeMin    int      `json:"age_min"`
	AgeMax    int      `json:"age_max"`
	Interests []string `json:"interests"`
}

// normalizeAudience bounds a suggested audience so the form can show it as
// options: a known gender, a sane age range, and a few short interests.
func normalizeAudience(a Audience) *Audience {
	if a.Gender != "female" && a.Gender != "male" {
		a.Gender = "any"
	}
	a.AgeMin = min(max(a.AgeMin, minAge), maxAge)
	a.AgeMax = min(max(a.AgeMax, a.AgeMin), maxAge)
	interests := make([]string, 0, maxInterests)
	for _, interest := range a.Interests {
		interest = clip(strings.TrimSpace(interest), maxInterest)
		if interest != "" && len(interests) < maxInterests {
			interests = append(interests, interest)
		}
	}
	a.Interests = interests
	return &a
}
