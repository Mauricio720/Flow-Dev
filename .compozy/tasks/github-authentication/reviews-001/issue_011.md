---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T16:20:08Z
status: resolved
file: packages/api/src/infra/database/dao/projects/drizzleProjectDao.ts
line: 13
severity: high
author: claude-code
provider_ref:
---

# Issue 011: Persista a seleção autorizada do projeto

## Review Comment

`setLastSelected` é um no-op tanto no DAO Drizzle quanto no DAO em memória. Além disso, o seletor navega com um Link para `/projects/[projectId]`, que chama apenas `projects.byId`; nenhum consumidor de produção chama `projects.select`. Mesmo com persistência e autorização corrigidas, escolher um projeto nunca atualiza `users.last_project_id`.

A raiz resolve a preferência por `access.me`, mas ela continua nula. A experiência de voltar à aplicação e retomar o projeto autorizado, exigida por US-005.AC-3, não funciona. Há ainda uma limitação de `app/page.tsx`: valida o último projeto apenas contra a primeira página do catálogo, descartando uma preferência válida fora dessa página.

Confirme a seleção pela mutação autorizada antes de navegar, grave a preferência de forma transacional e revalide a preferência diretamente por ID ao resolver `/`. Cubra seleção, retorno à raiz, preferência em página posterior e revogação (UT-012, IT-047 e IT-134).

## Triage

 - Decision: `valid`
 - Notes: Root cause: project selection is a no-op and the selector never calls projects.select. Fix: persist the protected selection and resolve the root preference by direct authorized ID.
- Notes:
