---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T16:20:08Z
status: resolved
file: packages/api/src/application/services/projects/catalogImporter.ts
line: 12
severity: high
author: claude-code
provider_ref:
---

# Issue 009: Execute a importação inteira em uma transação

## Review Comment

A validação ocorre antes das gravações, mas cada entrada é persistida por uma chamada independente a `upsert`, sem transação envolvendo o manifesto. Se a segunda ou uma entrada posterior falhar no banco, as anteriores permanecem alteradas apesar do comando terminar com erro. Uma reprodução com falha de armazenamento na segunda entrada confirmou que a primeira gravação já havia ocorrido.

Além disso, `drizzleProjectDao.ts:10` implementa upsert como SELECT seguido de INSERT, de modo que duas importações concorrentes de uma chave nova podem disputar a restrição única e acionar justamente essa falha parcial.

Componha a importação operacional sobre uma única transação, crie o DAO com o handle transacional e use INSERT ... ON CONFLICT para o upsert. Garanta rollback de todas as inserções/atualizações quando qualquer entrada falhar. Cubra falha de execução depois de uma escrita e concorrência, além do caso de manifesto inválido já coberto.

## Triage

 - Decision: `valid`
 - Notes: Root cause: catalog import writes each entry independently and upsert is SELECT-then-write. Fix: use one transaction and INSERT ON CONFLICT DO UPDATE.
- Notes:
