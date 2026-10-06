---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T10:34:24Z
status: resolved
file: packages/api/src/controllers/specFinalize.ts
line: 13
severity: high
author: claude-code
provider_ref:
---

# Issue 009: parentPackageId nunca é gravado e a visão de mudanças fica vazia

## Review Comment

`finalizeOnDone` chama `deps.capture.capture({...})` sem `parentPackageId`, e `SpecCaptureService` grava `parentPackageId: input.parentPackageId ?? null`. É o único chamador de produção, então todo pacote é salvo sem pai, inclusive os gerados por `adjust` e `retry`, que têm `claim.input.reviewedPackageId`.

Com isso, a comparação entre revisões não funciona no caminho real:

- `readSpecPackage` (`specPackageReads.ts:39-48`) devolve `parentPackageId: null`, `parentManifestHash: null` e calcula `diff` contra uma lista vazia, de modo que tudo aparece como adicionado.
- `useSpecStage` carrega o pai com `load.detail?.parentPackageId ?? null`, que é sempre `null`; `SpecChanges` retorna `null` (`compareRevisions` → `kind: "none"`).
- `diff_summary` nunca é escrito.

O PRD/TechSpec exigem que, após um ajuste, a autora veja as mudanças reais entre V1 e V2 ("Diffs compare captured block/source content ... Identify added/removed/changed sections and documents, allow full old/new comparison"; subtarefa 6.7; jornada E2E-009). Os testes de componente passam porque injetam o pai diretamente.

Correção sugerida:

- Em `finalizeOnDone`, passar `parentPackageId: claim.input.reviewedPackageId ?? null` (para `retry`, propagar o pacote revisado da tentativa de origem, que `assembleInput` já carrega).
- Validar no DAO que o pai pertence ao mesmo workflow e estágio (a FK composta já cobre o workflow).
- Adicionar teste de integração: ajuste concluído produz pacote com `parentPackageId` do pacote revisado e `taskSpec.package` devolve `parentManifestHash` e `diff` coerentes.

## Triage

- Decision: `VALID`
- Notes: Capture omitted the reviewed package relationship. Finalization now persists the reviewed package as the parent package.
