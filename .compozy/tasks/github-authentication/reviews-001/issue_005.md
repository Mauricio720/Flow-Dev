---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T16:20:08Z
status: resolved
file: apps/web/src/lib/auth/auth.ts
line: 14
severity: high
author: claude-code
provider_ref:
---

# Issue 005: Rejeite configuração incompleta antes de iniciar autenticação

## Review Comment

`environment()` só é exposto por `validateAuthEnvironment()`, que não possui nenhum consumidor. Ele também não valida que `BETTER_AUTH_URL` seja uma origem válida. A instância usa diretamente valores opcionais e, sem `DATABASE_URL`, recebe `database: undefined`, permitindo armazenamento efêmero do Better Auth em vez da fonte durável exigida. `cli/catalogImport.ts` e `cli/adminsProvision.ts` também fazem fallback para DAOs em memória e podem comunicar sucesso sem persistir nada.

O build deste checkout concluiu com avisos de base URL ausente e erros de segredo padrão, sem que a validação própria interrompesse a configuração. O Better Auth pode rejeitar alguns valores por conta própria, mas isso não garante o contrato completo, principalmente presença do banco e origem pública exata.

Valide banco, URL/origem e credenciais antes de compor os serviços de produção e antes de iniciar OAuth; falhe explicitamente nas CLIs quando o banco estiver ausente. Remova os fallbacks efêmeros operacionais. Cubra IT-145 e ausência de DATABASE_URL sem usar credenciais produtivas.

## Triage

 - Decision: `valid`
 - Notes: Root cause: environment validation is unused and CLIs fall back to memory. Fix: validate origin, secrets, database, and OAuth credentials at production boundaries.
- Notes:
