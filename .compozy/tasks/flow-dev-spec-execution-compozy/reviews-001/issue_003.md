---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T10:34:24Z
status: resolved
file: packages/api/src/controllers/specSupervise.ts
line: 23
severity: high
author: claude-code
provider_ref:
---

# Issue 003: Falha na finalização deixa a tentativa presa em finalizing

## Review Comment

A finalização só é disparada quando `ingestEvents` vê um evento de término **naquele tick** (`if (ingest.done) await finalizeOnDone(...)`). Só que `ingestEvents` persiste o cursor evento a evento (`specIngest.ts:20`), antes de a finalização terminar. Depois disso o evento de término nunca mais é reentregue.

`finalizeOnDone` (`specFinalize.ts:4-18`) não tem `try/catch`, e `superviseExecution` só trata `SpecRuntimeError`. Qualquer outro erro sobe até `tick()`, que apenas registra `spec.worker.tick_failed`:

- `freezeCandidate` lança `TaskError("artifact_invalid")` para arquivo inesperado, symlink ou UTF-8 inválido, e `package_limit` para excesso de tamanho (`candidateFreeze.ts:20-23,31,45,54`). Basta o agente deixar um arquivo de rascunho em `candidate/`.
- `finalization.finalize` relança tudo que não seja `artifact_conflict` ou errno de filesystem (`specFinalizationService.ts:49-54`), inclusive `stale_execution` e erros de banco.
- Uma queda do processo no meio da promoção tem o mesmo efeito.

Nesses casos a tentativa já está em `finalizing`. Quando o lease expira ela é reclamada, `superviseExecution` roda de novo, não encontra evento novo, `ingest.done` é `false` e o claim é liberado. Isso se repete indefinidamente: o estágio fica em "Capturando os documentos", o índice único de tentativa ativa bloqueia o workflow e um dos dois slots do runner fica ocupado. Nenhum teste cobre a retomada de uma tentativa já em `finalizing`.

Isso contraria o TechSpec: falha de validação deve virar tentativa `failed` visível com evidência parcial salva, e a finalização deve ser recuperável e idempotente após queda.

Correção sugerida:

- Tornar a finalização dirigida por estado: em `superviseExecution`, se `claim.state === "finalizing"`, chamar `finalizeOnDone` independentemente de `ingest.done` (a captura já é idempotente via `savePackage`/`loadPackage.finalizationId`).
- Em `finalizeOnDone`, capturar `TaskError` de `freeze`/`capture` e liquidar com `settle(claim, { state: "failed", reason })` usando `attemptFailureReason`.
- Adicionar testes: freeze com arquivo fora do escopo resulta em `failed/artifact_invalid`; reinício com tentativa em `finalizing` conclui a promoção.

## Triage

- Decision: `VALID`
- Notes: Finalization was only entered from a newly observed completion event. Supervision now resumes finalizing claims and converts TaskError failures into a durable failed attempt.
