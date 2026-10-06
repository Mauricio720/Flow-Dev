---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T16:20:08Z
status: resolved
file: packages/api/src/application/services/access/assignmentService.ts
line: 12
severity: medium
author: claude-code
provider_ref:
---

# Issue 020: Valide o projeto nas operações administrativas de atribuição

## Review Comment

O serviço verifica o usuário alvo, mas nunca verifica existência do projeto. Com Drizzle, assign de um UUID de projeto inexistente falha na FK e é traduzido como INTERNAL_SERVER_ERROR, embora IT-117 exija NOT_FOUND. Em remove, o DELETE de um projeto inexistente afeta zero linhas e o serviço retorna `{ assigned: false }`, embora a TechSpec exija NOT_FOUND para projeto ausente e idempotência apenas de pares com usuário/projeto válidos.

Também falta tradução de ProjectUnavailableError no mapeador administrativo. O comportamento difere entre DAOs em memória e Drizzle, portanto as poucas fixtures atuais não garantem o contrato de produção.

Valide usuário e projeto no escopo transacional da operação, traduza ausência de projeto para um erro de domínio seguro e NOT_FOUND, e mantenha a repetição idempotente para entidades existentes. Cubra projeto ausente/excluído e repetição de assign/remove sem alterar pares alheios (UT-019, IT-117 e IT-089).

## Triage

 - Decision: `valid`
 - Notes: Root cause: assign/remove validate only target users, producing inconsistent missing-project behavior. Fix: validate project existence transactionally and map its domain error to NOT_FOUND.
- Notes:
