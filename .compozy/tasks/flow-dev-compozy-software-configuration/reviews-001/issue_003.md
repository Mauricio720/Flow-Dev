---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T18:24:24Z
status: resolved
file: packages/api/src/infra/spec/runWorkspaceProvider.ts
line: 28
severity: high
author: claude-code
provider_ref:
---

# Issue 003: Execution ignores the admitted worktree binding

## Review Comment

Admission validates the selected worktree and stores its ID in the immutable run snapshot, but skill execution always prepares and mounts the task's isolated checkout. `GitRunWorkspaceProvider.prepare()` never reads `snapshot.workspace` or `snapshot.worktreeId`. Loop execution likewise resolves the task root workspace and starts the Loop there; `StartLoopInput` has no worktree identity. A run displayed as bound to `wt-1` therefore writes to a different checkout, violating the provenance and repository-isolation contract.

Resolve the exact admitted worktree at execution time and fail closed if it is no longer ready. Skill containers must mount that resolved path, and Loop starts must target the corresponding worktree context supported by the pinned API. Recovery must reuse the immutable worktree ID and must never fall back to the root checkout. Add an execution-level test that writes a sentinel in the selected worktree and proves the root checkout is untouched.

Affected code also includes `packages/api/src/infra/spec/compozy/loopRunExecutor.ts:57`, `packages/api/src/infra/spec/controlWorkspaceResolver.ts:16`, and `packages/api/src/infra/taskFlowWorkerComposition.ts:46`.

## Triage

- Decision: `VALID`
- Notes: A preparação do checkout ignora os campos imutáveis `snapshot.workspace` e `worktreeId`, e a resolução de Loop busca somente o workspace raiz. Vou resolver o worktree admitido por ID em cada execução, falhar se não estiver pronto e propagar esse contexto para skill e Loop, incluindo cobertura de execução.
- Escopo: rodada flow-dev-compozy-software-configuration/reviews-001 completa; sem commit automático. Testes e dependências diretas das correções estão incluídos.

## Resolution

O ID do worktree admitido é persistido e encaminhado ao Loop; a execução resolve o worktree exato, valida estado/repositório/caminho e monta esse caminho, falhando fechada quando a identidade diverge.

Verificação: `runWorkspaceProvider.test.ts` e contratos de worktree passaram.
