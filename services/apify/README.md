# Apify

Discovery provider for social video reference retrieval.

## Responsibilities

- Search for supported reference videos.
- Return normalized metadata and URLs.
- Preserve the original video URL where media is not directly downloadable.
- Surface failures without masquerading as successful content.

## Contract notes

The service must not assume every Apify result contains a direct asset URL. The backend must validate whether a reference can be consumed downstream before scheduling work.
