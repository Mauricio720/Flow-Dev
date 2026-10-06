---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T16:20:08Z
status: resolved
file: apps/web/src/features/issues/issue-composer/components/Workspace.tsx
line: 45
severity: high
author: claude-code
provider_ref:
---

# Issue 016: Revalide o acesso antes das ações na aba de projeto

## Review Comment

A permissão é consultada apenas ao renderizar `ProjectPage`. Depois da montagem, Workspace/useWorkspace executam envio, edição e publicação simulados totalmente no cliente; não existe próxima chamada protegida, tratamento de UNAUTHORIZED/NOT_FOUND ou descarte de estado quando sessão/atribuição é revogada. Uma aba aberta continua utilizável depois que outro administrador remove seu acesso ou outra aba encerra a sessão.

`retainProjectState` está somente no teste unitário e não participa da interface; a função retornar null não prova que dados visíveis foram descartados. A chave projectId reinicia o demonstrador ao trocar a rota, mas não cobre perda de acesso na mesma rota. US-004.EC-9, US-005.AC-4, task_05 e a TechSpec exigem saída do contexto e aviso na próxima ação.

Passe as interações pelo controle de sessão/projeto atual (mesmo enquanto a operação de produto é demonstrativa). Ao receber negação, cancele timers, remova o conteúdo local e ofereça login/seletor com aviso de mudança. Verifique revogação e logout com duas abas em E2E-003, E2E-006 e E2E-009.

## Triage

 - Decision: `valid`
 - Notes: Root cause: workspace actions remain local after the initial authorization check. Fix: revalidate the protected project before actions and clear local state after denial.
- Notes:
