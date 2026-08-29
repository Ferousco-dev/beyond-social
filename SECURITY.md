# Security Policy

Beyond Social handles user accounts, uploaded photos, generated video, and billing data.
We take reports of security issues seriously and will respond promptly.

## Reporting a vulnerability

**Do not open a public GitHub issue for a security vulnerability.**

Report it privately through GitHub's Security Advisories for this repository:
[Report a vulnerability](https://github.com/Ferousco-dev/beyond-social/security/advisories/new)

This opens a private channel visible only to the maintainer until a fix is ready,
so the report cannot be used against users while it is outstanding.

Include, if you can:

- What the vulnerability is and its impact
- Steps to reproduce it, or a proof of concept
- Any affected URL, endpoint, or component

## What to expect

- We aim to acknowledge a report within 5 business days.
- We will keep you updated as we investigate and fix the issue.
- We do not currently run a paid bug bounty program.

## Scope

In scope: the web app, edge functions, worker, and admin console in this repository, and
their production deployments.

Out of scope: third-party services we depend on (Supabase, Stripe, kie.ai, and social
platform APIs) — report those directly to the respective provider.

## Supported versions

This is a continuously deployed application, not a versioned release. Only the code
currently running in production is supported; there is no backport policy for older
commits.
