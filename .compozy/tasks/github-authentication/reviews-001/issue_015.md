---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T16:20:08Z
status: resolved
file: apps/web/src/features/issues/issue-composer/components/TopBar.tsx
line: 20
severity: high
author: claude-code
provider_ref:
---

# Issue 015: Trate o campo error retornado pelo cliente Better Auth

## Review Comment

`authClient.signOut()` resolve normalmente com `{ data: null, error }` para falhas HTTP, mas o código navega para `/login` sem inspecionar esse campo. Uma falha ao excluir a sessão pode deixar o token válido e apresentar ao usuário o resultado visual de uma saída concluída. Não há feedback recuperável.

O mesmo padrão aparece em `GitHubSignIn.tsx:13`: somente `.catch` limpa pending. Como erros HTTP resolvem a promise, um 429/500 mantém o botão desabilitado em “Abrindo o GitHub…” sem uma nova tentativa. Uma reprodução usando o cliente real com transporte HTTP simulado confirmou que signIn e signOut resolvem com `error.status: 500`.

Inspecione `result.error` ou configure callbacks onError adequados, mostre mensagens portuguesas recuperáveis e restaure o estado de interação em falhas. Só navegue após confirmar logout bem-sucedido. Cubra falha de banco no logout e limite/erro no início OAuth, conforme US-003.EC-6 e IT-026.

## Triage

 - Decision: `valid`
 - Notes: Root cause: Better Auth resolves HTTP failures in result.error, which the UI ignores. Fix: inspect errors, show retry feedback, and navigate only after successful logout.
- Notes:
