# Consent and retention for digital twins

A digital twin is a trained copy of a real person's face and voice. In most of
the places this product is used that makes it biometric data, which is a
different category from a photo of a shelf, and it carries obligations that do
not apply to anything else the app stores.

This document records what the code does today, what it deliberately does not
do, and the decisions that are still the owner's. It is written to be read by
somebody deciding whether this is safe to switch on.

**This is not legal advice, and nobody who wrote it is a lawyer.** It sets out
the mechanics honestly so that a lawyer reviewing it has something concrete to
review. The sections marked "owner decision" should not be resolved by reading
this file.

## What is collected, and where it goes

| Thing             | Where it lives                                 | Removed by                      |
| ----------------- | ---------------------------------------------- | ------------------------------- |
| Training footage  | `uploads` bucket, under the person's own id    | Deleting the avatar             |
| The trained twin  | HeyGen, as an avatar group and its looks       | Deleting the avatar             |
| Consent record    | `heygen_avatars.consent_version`, `consent_at` | Deleting the avatar             |
| Consent, provider | HeyGen, via its own consent endpoint           | Deleting the avatar group       |
| Handoff links     | `avatar_handoffs`, hashed, 20 minutes          | Expiry, and deleting the avatar |

The recording itself is the consent record. People read the statement in
`features/live-avatar/consent.ts` aloud on camera before saying anything else,
so the attestation and the training data are the same few seconds. That is
deliberate: a checkbox proves a click, a recording of somebody saying what they
are agreeing to proves rather more.

## Consent

Versioned, in `HEYGEN_CONSENT_VERSION`. Acceptances of an older wording stop
counting when the wording changes, which is why the version is stored on the row
and checked by the training endpoint rather than assumed.

The same footage is submitted to HeyGen as `consent_video`, so the provider's
own consent requirement is satisfied by the recording the person already made
rather than by sending them to a second page to repeat themselves.

## Deletion

The statement people read says the twin is theirs to "delete at any time from my
settings". `delete-heygen-avatar` is what makes that true: it deletes the group
at HeyGen first, then the training footage, then the row, then any outstanding
handoff link.

Provider first, on purpose. If the provider call fails the row stays and the
person can try again; if the row went first, the twin would be invisible here
and still trained over there with nothing left pointing at it.

A provider refusal is reported as a failure. Reporting success while a likeness
still exists somewhere else is the one answer this must never give.

### The honest gap

HeyGen's delete endpoint says it "permanently deletes an avatar group and all
its associated looks". It does not say whether the footage used to train it, or
the model derived from it, is destroyed with the group, and it does not publish
a retention period for either.

So the app can truthfully say it has asked for deletion and removed everything
it holds. It cannot truthfully say the provider has destroyed everything it
derived. Until that is confirmed in writing, the product should not claim
otherwise, and the consent wording should not be strengthened past what can be
kept.

**Owner decision:** whether to ask HeyGen for that confirmation before enabling
the feature, or to weaken the claim to match what is verifiable.

## Retention

Today: training footage is kept for as long as the twin exists, and deleted with
it. Nothing expires on a timer.

The argument for keeping it is that a dispute about a likeness needs the source
rather than only the provider's derived asset, which is the same reasoning
`voice_profiles` already follows for its enrolment clip.

The argument against is that it is the most sensitive object in the bucket, and
once a twin is trained the footage has done its job.

**Owner decision:** whether footage is deleted once `training_status` becomes
`ready`, or kept for a fixed window, or kept for the life of the twin. If a
window is chosen, `retention_prune_memories` in `0066` is the shape to copy, and
`/api/cron/retention` is where it belongs. Note that this cron currently deletes
nothing at all until `RETENTION_APPLY=1` is set.

## Jurisdiction

Not a decision the code can make, and the one with the sharpest edges:

- **BIPA (Illinois)** requires a written retention schedule and destruction
  "when the purpose has been satisfied or within 3 years of last interaction,
  whichever occurs first", plus written release before collection. It carries a
  private right of action.
- **GDPR Article 9** treats biometric data used to uniquely identify a person as
  a special category, permitted here on explicit consent, which must be as easy
  to withdraw as to give. Deletion in settings is the withdrawal path.
- **Texas CUBI** and **Washington My Health My Data** impose their own consent
  and destruction requirements.

**Owner decision:** which of these the product accepts it is subject to, and
whether that changes who can record a twin.

## Price

HeyGen's published API rates, read 2026-09-01 from its own help centre:

- Standard avatar video: **$1 per minute** of 720p or 1080p output
- Avatar IV: **$4 per minute** of 1080p output
- Pay-as-you-go, from $5, no subscription required

Avatar V's rate is **not published**. It is digital-twin only and is the
higher-fidelity engine, so it is unlikely to be cheaper than Avatar IV.

Working from Avatar IV's $4/minute as the nearest published figure, and this
app's own documented conversion of one credit to $0.05 of provider cost
(migrations `0051` and `0057`):

| Output length | Provider cost at $4/min | Credits at $0.05 |
| ------------- | ----------------------- | ---------------- |
| 15 seconds    | $1.00                   | 20               |
| 30 seconds    | $2.00                   | 40               |
| 60 seconds    | $4.00                   | 80               |

For comparison, the existing catalogue prices `kling-3.0/video` at 30 credits
and `kling-3.0/motion-control` at 60.

**Recommendation:** cap twin output at 30 seconds and set `HEYGEN_CREDIT_COST`
to **40**. That is a defensible number rather than a verified one, and it rests
on an unpublished rate.

**Owner decision:** confirm Avatar V's real rate against an invoice or a quote
before switching this on. `generate-heygen-avatar` refuses to run until
`HEYGEN_CREDIT_COST` is set, precisely so that this stays a decision rather than
a default. Note also that HeyGen bills per minute while this app charges per
run, so a flat rate is only honest while output length is capped.

## What is still not built

- No retention timer on training footage; it lives until the twin is deleted.
- No export of a person's own footage, which GDPR portability may require.
- No cap on twin output length, which the flat credit price above depends on.
