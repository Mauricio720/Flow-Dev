---
provider: manual
pr:
round: 1
round_created_at: 2026-10-05T21:01:21Z
status: resolved
file: packages/api/src/infra/planning/devControlPlanningGateway.ts
line: 15
severity: medium
author: claude-code
provider_ref:
---

# Issue 007: Planning gateway sends the service key without enforcing HTTPS

## Review Comment

The TechSpec integration contract states: "Server-only `PLANNING_BASE_URL` and `PLANNING_API_KEY`; HTTPS outside loopback test/development." `DevControlPlanningGateway.analyze` only checks that both values are present and then posts `Authorization: Bearer <key>` plus the full publication snapshot to `new URL(PLANNING_PATH, this.baseUrl)`.

A misconfigured `http://` base URL for a non-loopback host therefore transmits the service credential and Issue content in clear text, and an unparsable base URL throws a raw `TypeError` that is reported as a transient `planning_provider_unavailable` and retried three times. `requirePlanningConfiguration` (`controllers/planningInputGuard.ts`) has the same presence-only check, so start is accepted with a configuration the worker can never use safely.

Suggested fix: validate the base URL once (shared helper used by both the guard and the gateway): parse it, require `https:` unless the hostname is `localhost`/`127.0.0.1`/`::1`, and raise `planning_unconfigured` otherwise. Add gateway unit cases for a non-loopback `http://` URL and an invalid URL.

## Triage

- Decision: `VALID`
- Notes: Valid. The gateway and guard only checked presence. Fix: shared `parsePlanningBaseUrl` (application/planning/planningConfiguration.ts) parses the URL and requires https unless the host is loopback, raising `planning_unconfigured` otherwise; used by both `requirePlanningConfiguration` and `DevControlPlanningGateway.analyze` (before any request). Tests: helper unit tests and gateway cases for a non-loopback http URL and an unparsable URL.
