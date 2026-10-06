---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T16:20:08Z
status: resolved
file: apps/web/src/lib/auth/auth.ts
line: 21
severity: high
author: claude-code
provider_ref:
---

# Issue 006: Ative o limite OAuth compartilhado exigido pelo contrato

## Review Comment

A instância Better Auth não configura `rateLimit`. A classe `OriginRateLimiter` é usada apenas em um teste unitário e não participa de `/api/auth/sign-in/social`. Com a configuração efetiva, o contexto instalado informa armazenamento `memory`, janela padrão 10 e máximo global 100; não existe regra própria de 10 inícios OAuth por 60 segundos. O armazenamento por processo não preserva o limite entre instâncias e reinícios; o limitador padrão também pode ficar desativado fora de produção.

Configure explicitamente o limitador do Better Auth com armazenamento PostgreSQL, a regra de `/sign-in/social` e uma origem de cliente confiável conforme ADR-004. Ao fazê-lo, corrija também `schema.ts:72` e `0001_auth_access.sql`: `lastRequest` foi criado como timestamp, enquanto o modelo instalado espera número/bigint de milissegundos. Sem essa compatibilidade, a ativação do armazenamento em banco falhará.

Exercite o endpoint HTTP em IT-003, inclusive a 11ª tentativa e duas instâncias usando a mesma base. A aprovação do teste da classe isolada não demonstra limitação no fluxo real.

## Triage

 - Decision: `valid`
 - Notes: Root cause: the real auth flow uses the default in-memory limiter and timestamp lastRequest. Fix: configure database storage and a 10-per-60-second social sign-in rule with bigint milliseconds.
- Notes:
