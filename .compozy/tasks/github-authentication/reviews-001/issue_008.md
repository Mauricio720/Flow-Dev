---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T16:20:08Z
status: resolved
file: packages/api/src/application/services/access/assignmentService.ts
line: 11
severity: high
author: claude-code
provider_ref:
---

# Issue 008: Serialize autorização e operação com a revogação

## Review Comment

`assign` e `remove` verificam `isAdmin`, consultam o usuário e gravam em chamadas independentes. Os controllers não abrem uma transação para essa sequência e os DAOs não bloqueiam a designação autorizadora. Uma retirada de administrador pode concluir depois da checagem e antes da escrita, permitindo que a operação antiga altere atribuições depois do commit da revogação. A transação interna de `replaceAdmins` não engloba as operações administrativas.

O mesmo limite arquitetural aparece em `projectAccessService.ts:14-21` e `drizzleProjectDao.ts:12`: `findAuthorized` ignora o ator, lê o projeto e depois verifica papel/atribuição em consultas separadas; a seleção não mantém autorização e atualização numa operação serializada. A TechSpec e ADR-005 exigem predicados de acesso no snapshot da leitura e locks compatíveis com revogação para mutações.

Abra a transação no controller, crie DAOs vinculados a ela e mantenha o lock da designação/atribuição autorizadora até o commit. Faça as leituras de projeto com predicado de existência e permissão no mesmo SQL. Verifique IT-105 e os gates de revogação com barreiras de commit, não apenas testes sequenciais com fakes.

## Triage

 - Decision: `valid`
 - Notes: Root cause: admin checks and writes are separate from revocation, and project permission is checked after loading. Fix: use transaction-scoped DAOs/locks and authorization predicates in project queries.
- Notes:
