---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T16:20:08Z
status: resolved
file: apps/web/src/lib/auth/auth.ts
line: 24
severity: critical
author: claude-code
provider_ref:
---

# Issue 001: Corrija o contrato de retorno do perfil GitHub

## Review Comment

O `getUserInfo` retorna `{ id, name, email, image }`, mas o Better Auth 1.7.7 instalado repassa esse retorno sem transformação e o callback exige `providerResult.user` e `providerResult.data`. O callback encerra com `unable_to_get_user_info` antes de criar qualquer conta ou sessão, inclusive com um perfil GitHub válido. Além disso, o identificador estável é extraído de `data.id` pelo `accountSubject` do provedor, não do `id` no objeto plano.

Uma reprodução isolada do callback de perfil, com `fetch` simulado somente na fronteira de rede, retornou `hasRequiredUser: false` e `hasRequiredData: false`. O arquivo `dist/api/routes/callback.mjs` da dependência confirma a rejeição. O `as never` oculta essa incompatibilidade no typecheck.

Retorne a estrutura tipada `{ user: { name, email, image, emailVerified }, data: profile }`, valide o ID numérico e o login antes de aceitar o perfil, e remova a supressão do contrato da configuração. Cubra o callback real com os casos IT-002 e UT-037, incluindo ausência de email/avatar e perfil inválido.

## Triage

 - Decision: `valid`
 - Notes: Root cause: the Better Auth callback expects a provider result with user and data, but the flat return is rejected before account creation. Fix: return the typed structure and validate numeric id/login.
- Notes:
