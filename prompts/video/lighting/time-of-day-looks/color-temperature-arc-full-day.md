---
id: time-of-day-looks-color-temp-arc
title: The color-temperature arc across a full day
category: lighting
subcategory: color-temperature
tags: [color-temperature, golden-hour, blue-hour, midday]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [short-form-video, product-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.87
---

Color temperature moves through a predictable, non-linear arc across a real day,
and naming the correct Kelvin range for a given hour, not just "warm" or
"cool," is what lets a prompt or a grade land on a specific, believable time
rather than a generic mood.

The arc:

- Pre-dawn and blue hour: 9000-12000K, blue-dominant, dim.
- Sunrise and sunset (golden hour): 2500-3500K at the lowest sun angles,
  warming further right at the horizon.
- Mid-morning and mid-afternoon: 5000-5600K, close to neutral daylight standard.
- Solar noon under clear sky: 5500-6500K, the coolest and most neutral point of
  the day.
- Overcast at any hour: 500-1000K cooler than the equivalent clear-sky hour at
  the same time, because cloud scattering favors blue.
- The arc is not linear: color shifts fastest in the 20 minutes on either side
  of sunrise and sunset, and barely shifts across the three or four hours around
  solar noon. A sequence spanning midday to evening should hold midday nearly
  flat and put almost all the color movement in the final 30-40 minutes.

Why: the shifting Kelvin value is a direct function of how much atmosphere
sunlight travels through, near-zero extra atmosphere at solar noon giving
neutral, cool light, versus a long, oblique path at sunrise and sunset that
scatters out blue wavelengths and leaves warm ones dominant. Treating the day's
color arc as a smooth linear gradient misrepresents that physics and produces a
slow, mushy transition where a real one is fast and end-loaded.

Example: "midday scene holds a flat 5800K for three hours of story time, then
color drops fast through 4000K to 2800K in the final 20 minutes as the sun
sets."

Counter-example: an evenly paced linear warm crossfade applied across an entire
afternoon-to-sunset sequence. Real light barely moves for most of that span and
then moves fast at the end, so even pacing reads as an artificial dissolve, not
daylight.
