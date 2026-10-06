---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T16:20:08Z
status: resolved
file: apps/web/src/features/auth/login/components/GitHubSignIn.tsx
line: 13
severity: high
author: claude-code
provider_ref:
---

# Issue 014: Preserve e revalide o destino privado depois do login

## Review Comment

O botão sempre envia `callbackURL: "/"`. As páginas privadas redirecionam a `/login` sem guardar o destino solicitado e `LoginPage` não lê um destino. `normalizeDestination` é chamado apenas nos testes, portanto sua aprovação não demonstra retorno de deep link. Abrir um projeto autorizado sem sessão, autenticar e voltar não restaura aquela rota.

A página `/login` também não verifica uma sessão já válida: ela sempre mostra o formulário, contrariando US-001.AC-4. O retorno atual não revalida um destino pedido porque ele nunca é transportado até o servidor.

Integre um destino interno sanitizado ao redirecionamento para login e ao retorno OAuth, revalidando sessão e acesso ao projeto antes de abrir a rota. Redirecione quem já possui sessão para seu estado autorizado. Cubra destinos externos/manipulados, projeto autorizado e projeto revogado (IT-008 e IT-018).

## Triage

 - Decision: `valid`
 - Notes: Root cause: private redirects lose the requested path and login ignores an existing session. Fix: carry a sanitized destination and revalidate it before redirecting.
- Notes:
