---
id: hands-faces-and-text-in-frame-face-angle-and-camera-placement
title: Camera placement that avoids the worst face angles
category: video-quality
tags: [faces, camera-angle, lens, portraiture]
applicability:
  platforms: [tiktok, instagram, youtube]
  productTypes: [talking-avatar, ugc, short-form-video, ad-creative]
  styles: []
source: authored
version: 1
priorQuality: 0.91
---

Portrait photographers avoid dead-center head-on and steep low angles because
both distort a real face; generated video breaks even harder at those same
angles, so the same avoidance rule protects both the aesthetics and the geometry.

Camera placement guidance:

- Default to a 3/4 view, camera roughly 20-40 degrees off the nose, eye-level or
  a few degrees above: this is the angle real portrait and interview setups use
  because it reads the most natural, and it's also the angle the model has the
  most stable training coverage of.
- Avoid direct low-angle-looking-up shots on a talking face; that's where jaw and
  neck geometry warp first as the head turns.
- Avoid extreme profile (full 90 degree side view) for any shot longer than a
  couple seconds; near-silhouette side angles are where nose and lip shape drift
  most across frames.
- Use a longer focal length (85-135mm equivalent) with the camera farther back
  rather than a wide lens close to the face; wide-angle facial distortion close
  up compounds with model instability instead of reading as an intentional look.
- If the head must turn during the shot, keep the turn under about 30 degrees of
  total arc; full profile-to-profile turns are where identity drift is worst.

Why: extreme angles and wide-lens facial distortion are already the failure modes
real photographers manage around, and generative models inherit the same weak
spots because those angles are underrepresented and harder to reconstruct in
training footage.

Example: "3/4 view, eye level, 85mm equivalent compression, subject's head turned
slightly toward camera, minimal further rotation."
Counter-example: "low-angle close-up looking up at the subject's face while they
turn to full profile" — stacks two of the hardest angles into one shot.
