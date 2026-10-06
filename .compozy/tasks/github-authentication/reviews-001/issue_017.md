---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T16:20:08Z
status: resolved
file: apps/web/src/lib/auth/auth.ts
line: 24
severity: high
author: claude-code
provider_ref:
---

# Issue 017: Encaminhe falhas do callback para o login em português

## Review Comment

A rota de autenticação exporta `auth.handler` diretamente, a configuração não define retorno de erro para a aplicação e o início social não envia errorCallbackURL. O callback da dependência instalada usa por padrão `${baseURL}/error` e o parâmetro `error`; a aplicação espera `/login?erro=<enum>` e não possui integração que traduza access_denied ou falhas de autorização. As mensagens existentes no LoginScreen são alcançáveis apenas por URLs montadas manualmente.

Consequentemente, negação de consentimento, state inválido e falha de perfil não chegam à experiência de login recuperável em português exigida por US-001.AC-2. O callback pode abrir a página de erro genérica do Better Auth com erro técnico.

Configure um destino de erro suportado e integre um mapeamento seguro dos códigos OAuth para os valores portugueses permitidos, distinguindo negação, autorização inválida e falha temporária. Não repasse error_description não confiável como texto livre. Cubra callback com access_denied, state inválido e banco indisponível (UT-034, IT-001, IT-004 e IT-129).

## Triage

 - Decision: `valid`
 - Notes: Root cause: OAuth errors use Better Auth's technical default page and the app does not map error codes to Portuguese login states. Fix: configure login error callback and safe code mapping.
- Notes:
