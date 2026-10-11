# HeyGen

Avatar and voice workflow provider for the asset pipeline.

## Responsibilities

- Register avatar identities after user consent and training footage collection.
- Support voice cloning or association through the provider workflow.
- Persist provider identifiers and metadata in durable storage.
- Reuse existing avatars for later generation without repeating registration.

## Contract notes

The backend must store provider IDs and storage references, but never treat uploaded filenames as authoritative provider identifiers.
