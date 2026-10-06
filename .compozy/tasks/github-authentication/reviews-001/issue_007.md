---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T16:20:08Z
status: resolved
file: apps/web/src/app/api/trpc/[trpc]/route.ts
line: 10
severity: high
author: claude-code
provider_ref:
---

# Issue 007: Propague ao navegador o cookie renovado da sessão

## Review Comment

`auth.api.getSession({ headers })` renova a sessão no banco, mas a rota tRPC ignora os headers retornáveis do Better Auth e entrega apenas `cache-control: no-store`. O server caller também descarta headers, e não há chamada de retomada a `authClient.getSession`/hook de sessão nas telas privadas. O cookie permanece com a expiração emitida no login mesmo quando operações protegidas renovam `sessions.expiresAt`.

Um usuário ativo por vários dias pode perder o cookie no sétimo dia contado do login, embora a sessão no banco tenha sido estendida. Isso contradiz a política de sete dias sem uso e IT-144; `updateAge: 0` sozinho só resolve a parte persistida.

Capture os headers de `getSession` usando a API suportada e repasse todos os `Set-Cookie` na resposta tRPC. Providencie também a renovação via Route Handler quando a atividade acontece apenas em Server Components, conforme ADR-004, e teste expiração do cookie e do banco perto do limite.

## Triage

 - Decision: `valid`
 - Notes: Root cause: refreshed session Set-Cookie headers are discarded by tRPC and server rendering has no browser refresh bridge. Fix: propagate headers and add a session refresh route/client call.
- Notes:
