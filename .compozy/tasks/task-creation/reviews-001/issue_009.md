---
provider: manual
pr:
round: 1
round_created_at: 2026-10-02T18:02:34Z
status: resolved
file: apps/web/src/features/issues/issue-composer/hooks/useMessageActions.ts
line: 30
severity: high
author: claude-code
provider_ref:
---

# Issue 009: Ignore a navegação de uma aceitação recebida após trocar tarefa

## Review Comment

A conclusão de `start` chama `context.onAccepted(receipt)` mesmo depois de desmontar o AuthorStage de origem. Esse callback de Workspace compara o recibo com o taskId capturado antes do envio e chama `navigation.select(receipt.taskId)`. O `key={workspace.scope}` desmonta o formulário anterior, mas não cancela nem invalida a promessa/callback pendente.

Cenário: enviar uma Nova intenção, abrir outra tarefa pelo histórico antes da resposta, começar a escrever nela e então receber a aceitação antiga. O callback seleciona a tarefa recém-criada, retira o usuário da tarefa atual e desmonta seu input local. As proteções contra respostas antigas de `useTaskWorkspace` não cobrem essas mutações.

Vincule as conclusões de comandos à geração de navegação/escopo atual e invalide seus efeitos de UI ao desmontar. A aceitação pode atualizar o histórico sem selecionar automaticamente a tarefa quando o usuário já saiu dela. Cubra esse caso no Workspace com start pendente e navegação/edição intermediária. Requisitos: US-001.AC-4, US-007.EC-8 e regra de respostas fora de escopo da TechSpec.

## Triage

- Decision: `VALID`
- Root cause: a pending start command keeps an `onAccepted` callback that can navigate after its originating workspace scope unmounts.
- Fix approach: attach acceptance effects to the active workspace scope and ignore a stale command's navigation while still refreshing history.
