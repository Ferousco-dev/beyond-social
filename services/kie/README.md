# KIE AI

Primary video generation and transformation provider for the rebuild.

## Responsibilities

- Accept validated generation requests.
- Execute video generation or video-to-video workflows through the provider.
- Return durable job identifiers and result metadata.
- Support callback-driven status updates and idempotent event handling.

## Initial focus

The first implementation target is a WAN 2.6 style video-to-video transformation path, subject to provider availability and API validation.
