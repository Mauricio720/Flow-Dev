---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T10:34:24Z
status: valid
file: packages/api/src/application/services/spec/specLifecycleService.ts
line: 44
severity: low
author: claude-code
provider_ref:
---

# Issue 020: Código morto e stubs no fluxo de Spec

## Review Comment

Há funções e valores sem chamador de produção, usados apenas em testes. Eles dão a impressão de que regras do TechSpec estão ativas quando não estão.

**Sem chamador fora de testes:**

- `SpecLifecycleService.authorizeDispatch`, com `findDispatchAttempt` e `failQueuedAttempt` no DAO. O worker usa `checkEntitlement`.
- `sealSpecInput` (`specInput.ts:54`). Como consequência, `commitSha` é sempre `null` no input da tentativa e `pinnedCommit` nunca é enviado a `prepareCheckout`; o commit base é o `HEAD` do clone, registrado só no marcador e na linha do workspace.
- `specTransition` e `assertStageTransition` (`specTransition.ts`). A tabela de transições permitidas não é consultada por nenhum DAO, o que contribui para as issues 002 e 004.
- `buildRetryContext`, `mayDelete` (`specRetention.ts`), `assertCurrentFence`, `TaskSpecWorkerDao.activeCount`, `SpecWorkspaceGateway.inspect`, `withoutSpecKey`.
- O ramo `assertInteraction` em `specAccept.ts:36,55-60` é inalcançável, porque `answer`/`permission` passam por `resolveInteraction`.

**Valores fixos que deveriam vir de dados:**

- `BUNDLE_VERSION = "1"` em `specCaptureService.ts:9`, enquanto `resources/spec/bundle.json` declara `"1.0.0"`. O hash do manifesto não reflete a versão real do bundle.
- `decisionIds: []` em `buildSpecInput`; `answers: []` em `buildSpecPrompt`.
- `permissionHistory` é salvo no contexto de retry mas não entra em `inlineContext`.
- Colunas `runtime_session_id`, `runtime_generation`, `runtime_sequence` e `emitted_at` de `task_spec_events` nunca são gravadas; `normalized.runtimeSequence` é descartado em `specIngest.ts:18`.

**Stubs no frontend:**

- `onOpenDocument={() => undefined}` em `SpecStageBody.tsx:31`: links relativos ao pacote viram botões que não fazem nada.
- `selection.documentId` é decodificado da URL (`specSelectionParams.ts`) e nunca consumido.
- `initial.selection.packageId` tem precedência permanente em `useSpecStage.ts:26`, então trocar de estágio não muda o pacote exibido quando a URL traz `specPackage`.

Correção sugerida: remover o que não será usado, ou ligar cada item ao fluxo real (selar o commit no dispatch, aplicar `assertStageTransition` nos DAOs, ler a versão do bundle do contrato carregado, implementar a navegação entre documentos).

## Triage

- Decision: `VALID`
- Notes: The review identifies several disconnected safeguards and frontend stubs. They are valid but broad follow-up work, not safe incidental cleanup.
