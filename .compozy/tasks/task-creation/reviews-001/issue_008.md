---
provider: manual
pr:
round: 1
round_created_at: 2026-10-02T18:02:34Z
status: resolved
file: apps/web/src/features/issues/issue-composer/hooks/useDraftReview.ts
line: 31
severity: high
author: claude-code
provider_ref:
---

# Issue 008: Preserve edições feitas enquanto o salvamento está pendente

## Review Comment

`save()` captura o draft enviado, aguarda `actions.save(...)` e depois chama `editor.discard()` sem verificar se o usuário editou novamente. Os inputs de `DraftEditorFields` continuam habilitados durante o salvamento. Uma resposta bem-sucedida elimina também as alterações feitas depois do clique, exibindo a revisão anterior que acabou de chegar do servidor.

Reprodução pelo fluxo: editar o título para A, clicar Salvar em conexão lenta, alterar o objetivo para B enquanto a requisição está pendente, então receber o sucesso e a atualização da revisão. `discard()` limpa todo o estado local; B desaparece sem ter sido enviado.

Limpe apenas o snapshot que foi confirmado. Se o editor mudou durante a requisição, preserve os novos valores como alterações locais sobre a revisão salva; alternativamente bloqueie explicitamente edição durante esse período. Adicione teste com promessa de save controlada e alteração intermediária de outro campo. Requisitos: US-002.AC-2, US-009.AC-5 e US-016.EC-5.

## Triage

- Decision: `VALID`
- Root cause: successful saves unconditionally discard the entire editor state, including edits made after the request snapshot.
- Fix approach: clear only when the current draft still equals the submitted snapshot; retain subsequent edits over the refreshed revision.
