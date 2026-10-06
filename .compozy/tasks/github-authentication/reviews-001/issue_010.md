---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T16:20:08Z
status: resolved
file: packages/api/src/infra/database/dao/drizzleAccessDao.ts
line: 10
severity: high
author: claude-code
provider_ref:
---

# Issue 010: Corrija cursores que omitem registros autorizados

## Review Comment

`listUsers` e `listAssignments` sempre consultam os primeiros 51 registros e só depois aplicam o offset do cursor em memória. Com 121 entradas, a primeira página devolve 50, a segunda devolve apenas o registro 51, e os demais ficam inalcançáveis. O schema aceita qualquer texto como cursor e `Number(cursor)` pode produzir NaN, offsets negativos ou frações sem o BAD_REQUEST contratado.

Há perda equivalente no catálogo: `drizzleProjectDao.ts:11` e `inMemoryProjectDao.ts:25` devolvem como cursor o item 51 que não foi entregue, mas a próxima consulta começa depois dele. A reprodução em memória alcançou somente 120 de 122 projetos. Já `projectAccessService.ts:9-10` pagina o catálogo global antes de filtrar atribuições; uma conta atribuída apenas a um projeto posterior recebe página vazia com nextCursor. `ProjectSelector` renderiza EmptyProjects nessa situação e esconde a navegação para a página que contém seu projeto.

Implemente cursores estáveis e validados, aplique a permissão antes do limite SQL e use a última entrada efetivamente entregue como posição da próxima página. Retorne cursor nulo quando não existe outro registro autorizado. Teste 121/501 entradas sem omissões ou duplicações (IT-043, IT-050, IT-063) e cursores inválidos (UT-033, IT-116).

## Triage

 - Decision: `valid`
 - Notes: Root cause: DAOs limit before applying offsets/permissions and accept arbitrary cursors. Fix: use validated stable cursors and filter authorization before limiting.
- Notes:
