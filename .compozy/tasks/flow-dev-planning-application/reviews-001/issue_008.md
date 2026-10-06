---
provider: manual
pr:
round: 1
round_created_at: 2026-10-05T21:01:21Z
status: resolved
file: packages/api/src/controllers/taskPlanningWorkerController.ts
line: 22
severity: medium
author: claude-code
provider_ref:
---

# Issue 008: In-flight planning dispatch is not aborted on worker shutdown

## Review Comment

The TechSpec budget for worker HTTP says: "240-second absolute request deadline including body read … Abort on lease loss/shutdown." `dispatch` creates a private `AbortController` that is aborted only when a heartbeat fails. `tick()` takes no signal, and `TaskWorkerController.run(signal)` checks the shutdown signal only between ticks.

On SIGTERM/SIGINT the CLI aborts its controller, but `runPool` keeps awaiting the current planning tick, so the process can stay alive for up to 240 seconds per slot. Deploy orchestrators typically SIGKILL well before that; the operation is then left `running` until the lease expires and the reclaim counts as one of only three dispatches, so rolling restarts can exhaust the recovery budget of a healthy operation.

Suggested fix: pass the shutdown `AbortSignal` from `run` through `tick` into `dispatch`, link it to the dispatch `AbortController`, and on shutdown requeue the claim (without consuming an attempt if feasible) or leave it for lease recovery after aborting the HTTP request promptly. Add a controller test that aborts the signal mid-request and asserts the gateway call is cancelled and no completion is saved.

## Triage

- Decision: `VALID`
- Notes: Valid. The shutdown signal never reached the planning dispatch. Fix: `TaskWorkerController.run` passes its signal through `tick`/`runKind` into `TaskPlanningWorkerController.tick(shutdown)`, which links it to the dispatch AbortController (and removes the listener afterwards). On shutdown the gateway request aborts promptly, no completion is saved, and the operation is left for lease recovery (requeue without consuming an attempt is not possible because the attempt is counted at claim). Test: aborting the signal mid-request cancels the gateway call and nothing is completed.
