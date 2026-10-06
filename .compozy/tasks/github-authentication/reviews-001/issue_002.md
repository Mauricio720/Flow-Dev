---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T16:20:08Z
status: resolved
file: packages/api/src/routers/projects.ts
line: 7
severity: critical
author: claude-code
provider_ref:
---

# Issue 002: Conecte os routers ao armazenamento persistente

## Review Comment

A composição usada pelo `appRouter` cria `InMemoryProjectDao` e `sharedAccessDao`; `routers/access.ts:7` usa o mesmo DAO em memória. Os mapas de usuários, atribuições e administradores começam vazios, e `seedUser` só aparece nos testes. Entretanto, o Better Auth grava usuários no PostgreSQL e as CLIs, quando configuradas, importam projetos e administradores nesse banco. Nenhum desses registros chega aos DAOs utilizados pelos procedimentos da aplicação.

Uma chamada ao router real com um principal autenticado não semeado devolveu `access.me -> NOT_FOUND`. Assim, um administrador provisionado não consegue administrar acessos, usuários autenticados não aparecem no diretório e projetos importados não são utilizados. A funcionalidade central das tasks 01, 03 e 04 está desconectada, contrariando ADR-004 e ADR-005.

Componha os controllers de produção com DAOs Drizzle sobre a mesma base usada pela autenticação, deixando DAOs em memória somente como fixtures de teste. Verifique a jornada provisionar antes do primeiro login -> access.me -> atribuir -> listar projeto, além da durabilidade após reinício (IT-108, IT-133 e IT-138).

## Triage

 - Decision: `valid`
 - Notes: Root cause: production routers construct in-memory DAOs, disconnected from Better Auth and CLI PostgreSQL writes. Fix: compose production controllers with Drizzle DAOs over the required database.
- Notes:
