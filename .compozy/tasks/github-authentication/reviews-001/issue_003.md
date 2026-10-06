---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T16:20:08Z
status: resolved
file: apps/web/src/lib/auth/auth.ts
line: 13
severity: high
author: claude-code
provider_ref:
---

# Issue 003: Configure IDs Better Auth compatíveis com as colunas UUID

## Review Comment

Todas as chaves de `users`, `accounts`, `sessions` e `verification` são UUID no schema e nas migrações, mas a configuração não define `advanced.database.generateId`. O Better Auth 1.7.7 gera strings aleatórias por padrão e envia esses IDs explicitamente ao adaptador; o `defaultRandom()` das tabelas não substitui um ID enviado.

A reprodução com a configuração efetiva confirmou que `context.generateId({ model: "user" })` não produz UUID. Portanto, mesmo após corrigir o formato do perfil, a persistência do estado OAuth ou da conta/sessão falhará por incompatibilidade de tipo no PostgreSQL.

Configure `advanced.database.generateId: "uuid"` (ou geração pelo banco suportada pelo adaptador) e valide criação de verification, usuário, conta e sessão com PostgreSQL real. Esse requisito está explícito em “Modelos de dados” da TechSpec.

## Triage

 - Decision: `valid`
 - Notes: Root cause: UUID columns receive Better Auth default string IDs. Fix: enable UUID generation and validate auth records against PostgreSQL.
- Notes:
