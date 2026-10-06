# Developer Experience: Flow Dev CompozyOS Integration

Public surface for [this feature's TechSpec](_techspec.md). Flow Dev exposes authenticated tRPC and UI; CompozyOS remains an internal server-side HTTP/UDS dependency. The `_spec.md` in the journey below is the future application output. No new Flow Dev CLI, SDK, YAML, `config.toml` key, or MCP tool is introduced.

## Golden Path

1. Administrator opens `/admin/software/compozy`, saves supported non-secret settings, connects a Codex ChatGPT account, and sees `ready` only after provider, catalog, runtime, and host checks pass.
2. Task author opens an approved task, selects `create_spec`, a ready connection, an `available_live` model, its advertised reasoning option, and isolated checkout or a ready worktree; Save changes only the plan.
3. Author presses Start. Flow Dev returns one action/run ID, shows real execution status, and later presents `_spec.md` Product and Technical parts with applicable companion contracts for review.
4. Author approves the exact package version, then explicitly starts `create_tasks`. Selected `implement-tasks` and `review-and-fix` Loops remain separate actions with their actual CompozyOS outcomes.

## tRPC Surface

All procedures require a Flow Dev session. `software.compozy.*` requires administrator status on every call; `taskFlow.*` reads require task access and writes require the task author. Server responses contain safe labels, IDs, status codes, timestamps, and runtime provenance, never credentials. Names below are contract targets to implement.

| Procedure | Input | Success | Failure codes |
| --- | --- | --- | --- |
| `software.compozy.get` | none | settings, revision, host/runtime summary | `FORBIDDEN`, `SERVICE_UNAVAILABLE` |
| `software.compozy.readiness` | none | separate app/account/runtime/host checks, `checkedAt`, `stale` | `FORBIDDEN`, `SERVICE_UNAVAILABLE` |
| `software.compozy.connections` | cursor/limit | paged safe connection rows | `FORBIDDEN`, `BAD_REQUEST` |
| `software.compozy.history` | cursor/limit | paged redacted audit rows | `FORBIDDEN`, `BAD_REQUEST` |
| `software.compozy.saveSettings` | values, `expectedRevision`, `idempotencyKey` | accepted revision and readiness | `BAD_REQUEST`, `CONFLICT`, `FORBIDDEN` |
| `software.compozy.beginCodexLogin` | connection ID or new label, idempotency key | operation ID, verification URL/code, expiry | `FORBIDDEN`, `CONFLICT`, `SERVICE_UNAVAILABLE` |
| `software.compozy.beginClaudeLogin` | connection ID or new label, idempotency key | operation ID and safe guided login state | `FORBIDDEN`, `CONFLICT`, `SERVICE_UNAVAILABLE` |
| `software.compozy.pollLogin` | operation ID | pending/confirmed/failed, safe identity | `FORBIDDEN`, `BAD_REQUEST`, `CONFLICT` |
| `software.compozy.confirmAccount` | operation ID, expected connection revision | connection status and revision | `FORBIDDEN`, `CONFLICT`, `PRECONDITION_FAILED` |
| `software.compozy.disconnect` | connection ID, expected revision, idempotency key | disabled status and affected active-run count | `FORBIDDEN`, `CONFLICT` |
| `software.compozy.renameConnection` | connection ID, label, expected revision | revised label/revision | `BAD_REQUEST`, `FORBIDDEN`, `CONFLICT` |
| `taskFlow.options` | task ID | current skill/Loop definitions, live models/efforts/worktrees and reasons | `FORBIDDEN`, `SERVICE_UNAVAILABLE` |
| `taskFlow.byTask` / `taskFlow.runs` | task ID, optional cursor | plan, packages, runs, safe provenance; legacy projection where needed | `FORBIDDEN`, `BAD_REQUEST` |
| `taskFlow.savePlan` | task ID, ordered actions, expected revision, idempotency key | plan revision, no run ID | `BAD_REQUEST`, `FORBIDDEN`, `CONFLICT` |
| `taskFlow.startAction` | task/action IDs, expected revision, idempotency key | exactly one run ID and queued/running state | `FORBIDDEN`, `CONFLICT`, `PRECONDITION_FAILED`, `SERVICE_UNAVAILABLE` |
| `taskFlow.approvePackage` | task/package IDs, exact version, idempotency key | approved package/version | `FORBIDDEN`, `CONFLICT`, `PRECONDITION_FAILED` |
| `taskFlow.cancelRun` / `taskFlow.retryAction` | task/run or action ID, expected revision, idempotency key | acknowledged/settled status | `FORBIDDEN`, `CONFLICT`, `PRECONDITION_FAILED` |

Example successful plan save (shown as tRPC input/output data):

```json
{"input":{"taskId":"9c78d51d-1c2a-4dfb-8825-48fa421a7612","expectedRevision":0,"idempotencyKey":"85227f5c-40a2-44ef-acd7-53794c803156","actions":[{"kind":"create_spec","runtime":{"connectionId":"15ea1081-f1a6-4c67-82ad-1eb6a122d96f","providerId":"codex","modelId":"gpt-5.6-sol","reasoningEffort":"high"},"workspace":{"kind":"isolated"}}]}},"output":{"revision":1,"state":"planned","runId":null}}
```

A stale plan revision returns `CONFLICT` with domain code `plan_version_changed` and the current safe revision. A stale model returns `PRECONDITION_FAILED` with `catalog_stale` or `model_unavailable`; neither creates a run. A lost `startAction` response retried with the same idempotency key returns the original run ID.

Example Software settings save: `software.compozy.saveSettings` input `{ "values": { "enabled": true, "docsProxyUrl": "https://docs.example.com/spec", "maxActiveActions": 2 }, "expectedRevision": 0, "idempotencyKey": "f907e2bf-42dd-4dc4-a5a8-93f95f2d76ea" }` returns `{ "revision": 1, "settings": { "enabled": true, "docsProxyUrl": "https://docs.example.com/spec", "maxActiveActions": 2 } }`. `docsProxyUrl="http://..."` returns `BAD_REQUEST` with `docs_proxy_https_required`; `maxActiveActions=5` returns `BAD_REQUEST` with `max_active_actions_out_of_range`.

## CompozyOS Control Calls

Flow Dev's server adapter uses the exact pinned OpenAPI for payloads and status codes. It calls `POST /api/providers/{provider_id}/auth/probe`, `GET /api/model-catalog/providers/{provider_id}/models` and source status, `GET/POST /api/workspaces/{workspace_id}/worktrees`, `GET .../worktrees/{id}/status`, `GET /api/workspaces/{workspace_id}/loops`, `GET .../loops/{name}`, `POST .../loops/{name}/run`, and session create/prompt/status/stream routes. The adapter verifies version and workspace identity before any mutation. A Loop selected at version `v` that is now version `v+1` returns `loop_version_changed`; it is never auto-upgraded.

The optional `compozy mcp serve --workspace /absolute/path/to/workspace` relay exposes `compozy_host__*` tools only for its published workspace-safe subset. It is not a dependency for Software settings, provider auth, model catalog, or worktree controls.

## Errors

| Condition | Domain code | Operator-facing action |
| --- | --- | --- |
| Missing/expired provider login | `auth_required` | Administrator reconnects that connection. |
| Catalog row is static, unknown, or stale | `catalog_stale` | Refresh provider discovery; author rechecks choice. |
| ACP rejects model or effort | `model_unavailable` / `reasoning_effort_unsupported` | Author chooses a newly validated option for a future action. |
| Worktree missing, foreign, dirty, or pending | `worktree_not_ready` | Author selects a ready context or host operator repairs it. |
| Loop removed/changed/disabled | `loop_version_changed` | Author reviews the current definition and confirms again. |
| Runtime pin/image/isolation fails | `runtime_incompatible` | Host operator repairs pinned runtime; no bypass in UI. |
| External result cannot be determined | `outcome_unknown` | Show reconciling state; do not start another run. |

Sensitive upstream error bodies and command output are reduced to safe codes. No tRPC response includes an auth home path, token, OAuth verifier, GitHub credential, or raw environment variable.
