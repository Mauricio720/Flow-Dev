---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T16:20:08Z
status: resolved
file: packages/api/package.json
line: 14
severity: high
author: claude-code
provider_ref:
---

# Issue 004: Versione o journal necessário para executar as migrações

## Review Comment

O script `db:migrate` executa `drizzle-kit migrate`, mas `packages/api/drizzle/` contém apenas `0000_catalog.sql` e `0001_auth_access.sql`, sem `meta/_journal.json`. O migrador instalado usa esse journal para descobrir e ordenar as migrações. A chamada somente de leitura `readMigrationFiles({ migrationsFolder: "./drizzle" })`, executada no pacote API sem conectar a banco, falhou com `Can't find meta/_journal.json file`.

Assim, uma implantação nova não consegue aplicar a fundação de catálogo e autenticação pelo comando entregue. Gere e versione as migrações com os metadados esperados pelo Drizzle, preservando a entrada demo de UUID fixo, e execute o script documentado contra PostgreSQL descartável. Não basta aplicar os arquivos SQL manualmente: o caminho operacional contratado precisa funcionar.

## Triage

 - Decision: `valid`
 - Notes: Root cause: drizzle-kit cannot discover SQL migrations without meta/_journal.json. Fix: generate and version the migration metadata.
- Notes:
