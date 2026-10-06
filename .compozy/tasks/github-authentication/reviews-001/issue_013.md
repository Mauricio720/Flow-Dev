---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T16:20:08Z
status: resolved
file: apps/web/src/features/access/access-management/index.tsx
line: 23
severity: high
author: claude-code
provider_ref:
---

# Issue 013: Consuma todas as páginas de usuários e projetos no admin

## Review Comment

A tela guarda somente `page.items` de `access.users` e `projects.list`, descartando `nextCursor`. `app/admin/access/page.tsx` também passa apenas `users.items` ao componente. Não há paginação do diretório nem busca/paginação dos projetos no seletor administrativo.

Mesmo após reparar a paginação dos DAOs, apenas os primeiros 50 projetos podem ser escolhidos para atribuir/remover, e o diretório inicial omite contas posteriores sem fornecer navegação. Buscar usuários não corrige a omissão do catálogo de projetos. Isso viola a regra de não introduzir limites artificiais e US-008.EC-3.

Passe a página completa ao componente e implemente continuação por cursor ou busca paginada para cada coleção, preservando todas as entradas alcançáveis. Teste administração com pelo menos 121 contas e 121 projetos, incluindo atribuição do último projeto (IT-063, IT-070 e IT-073).

## Triage

 - Decision: `valid`
 - Notes: Root cause: admin UI discards nextCursor for users and projects. Fix: consume all protected cursor pages.
- Notes:
