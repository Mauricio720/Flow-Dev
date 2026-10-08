---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T18:24:24Z
status: resolved
file: packages/api/src/infra/spec/compozy/snapshotRunExecutor.ts
line: 44
severity: critical
author: claude-code
provider_ref:
---

# Issue 001: Terminal runs leave credential-bearing containers alive

## Review Comment

`reconcile()` returns a terminal result without stopping the Podman launcher, and the rejected-prompt branch at line 63 also returns `blocked` without cleanup. The dispatcher then deletes only the host grant directory. Because the detached container still holds the bind mount, the copied `auth.json` or `.credentials.json` remains reachable from that container even after the run is terminal. The cancellation path has the inverse gap: `RunCanceller` removes the container directly, but `TaskFlowRunControl` never releases the grant directories. Partial failures while creating multiple grants in `TaskFlowDispatcher.request()` leak any grants created before `Promise.all` rejects as well.

Centralize terminal cleanup so the container is stopped before grants are released for every succeeded, failed, blocked, canceled, stalled, and exhausted outcome. Keep resources only while a genuinely uncertain run is reconciling, and add compensation for partially created grants. Route cancellation through the same lifecycle instead of bypassing `PodmanRunLauncher.stop()`.

Affected code also includes `packages/api/src/application/services/task-flow/taskFlowDispatcher.ts:57`, `packages/api/src/application/services/task-flow/taskFlowRunControl.ts:21`, and `packages/api/src/infra/spec/runCanceller.ts:9`.

## Triage

- Decision: `VALID`
- Notes: A reconciliação retorna estados terminais sem parar o launcher; rejeição também termina cedo. Cancelamento remove diretamente o container e não libera grants, e `Promise.all` não compensa grants parciais. Vou centralizar parada e liberação na liquidação terminal, manter recursos nos resultados incertos, rotear cancelamento pelo executor e compensar concessões parciais.
- Escopo: rodada flow-dev-compozy-software-configuration/reviews-001 completa; sem commit automático. Testes e dependências diretas das correções estão incluídos.

## Resolution

O executor para o launcher em resultados terminais, rejeições e falhas de reconciliação; cancelamento usa o mesmo launcher, libera grants após settlement aceito e compensa grants parciais.

Verificação: `test/task-flow-executor.test.ts` (5 testes) e `test/task-flow-loops.test.ts` (4 testes) passaram.
