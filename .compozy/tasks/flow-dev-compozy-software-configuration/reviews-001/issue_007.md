---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T18:24:24Z
status: resolved
file: apps/web/src/features/issues/issue-composer/spec/unified/PlanEditor.tsx
line: 13
severity: high
author: claude-code
provider_ref:
---

# Issue 007: Loop edits can start stale saved configuration

## Review Comment

The dirty fingerprint compares loop name, runtimes, and workspace but omits `loopVersion` and `inputs`. Editing a Loop input therefore leaves Save disabled and Start enabled; clicking Start executes the old persisted input while the form shows the new value. The recovery text for a changed live definition says to remove and re-add the Loop, but the draft hook and editor expose no remove or replace operation. Adding the new version only appends another Loop while the stale action remains, and saving is rejected when validation reaches that stale action.

Include loop version and a stable serialization of validated inputs in dirty-state comparison, disable Start whenever any displayed draft differs from the persisted action, and add explicit remove/replace controls for unstarted actions. A changed live definition should offer a concrete renewal action that replaces the stale version and rebuilds declared inputs and runtime roles.

Affected code also includes `apps/web/src/features/issues/issue-composer/spec/unified/usePlanDraft.ts:26` and `apps/web/src/features/issues/issue-composer/spec/unified/LoopFields.tsx:14`.

## Triage

- Decision: `VALID`
- Notes: A comparação de dirty omite versão e inputs, a execução permanece liberada e o editor não remove/substitui ações. Vou incluir os campos no fingerprint, bloquear Start com draft divergente e dar controles para remover ações não iniciadas e renovar uma definição stale substituindo sua versão e campos declarados.
- Escopo: rodada flow-dev-compozy-software-configuration/reviews-001 completa; sem commit automático. Testes e dependências diretas das correções estão incluídos.

## Resolution

Dirty state compara inputs e versão salva do Loop; alterações desabilitam Start até salvar. A edição oferece remoção de ação planejada e atualização explícita para a definição ao vivo.

Verificação: `UnifiedLoops.test.tsx` passou (6 testes).
