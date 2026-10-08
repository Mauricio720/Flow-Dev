---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T18:24:24Z
status: resolved
file: packages/api/src/infra/spec/compozy/snapshotRunExecutor.ts
line: 62
severity: high
author: claude-code
provider_ref:
---

# Issue 004: Uncertain skill submission cannot be reconciled

## Review Comment

The executor creates a workspace and session before submitting the prompt, but it returns `{ kind: "unknown" }` without those identifiers when submission throws an uncertain error or returns a non-accepted, non-rejected status. The dispatcher persists runtime IDs only for `submitted` results. On every later lease, `reconcile()` sees no `sessionId` or `workspaceId` and returns `unknown` again, so the action remains in `reconciling` forever and keeps the task's active-write slot.

Persist the workspace/session identity before prompt submission, or allow unknown results to carry runtime identity and bind it atomically before advancing to reconciliation. Reconciliation can then inspect the authoritative session and settle it. Cover both a response lost after acceptance and a definitive upstream failure; the existing scripted dispatcher test supplies an artificial later result and does not exercise this executor path.

Affected code also includes `packages/api/src/application/services/task-flow/taskFlowDispatcher.ts:45`.

## Triage

- Decision: `VALID`
- Notes: Identificadores de sessão/workspace são retornados apenas em `submitted`; a submissão incerta descarta os IDs criados e o dispatcher não tem como reconciliá-los. Vou persistir a identidade do runtime antes de enviar o prompt e preservá-la em falhas incertas/rejeitadas para permitir a consulta autoritativa e liquidação.
- Escopo: rodada flow-dev-compozy-software-configuration/reviews-001 completa; sem commit automático. Testes e dependências diretas das correções estão incluídos.

## Resolution

Resultados incertos preservam workspace e sessão quando conhecidos; o dispatcher persiste esses IDs e reconcilia o run, limpando o launcher em terminalidade ou quando faltam IDs.

Verificação: executor de snapshot e testes de reconciliação passaram.
