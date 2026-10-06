---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T19:19:57Z
status: resolved
file: packages/api/drizzle/0000_damp_lightspeed.sql
line: 1
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Preservar a atualização incremental dos bancos legados

## Review Comment

O histórico anterior continha `0000_catalog.sql` e `0001_auth_access.sql`, com tabelas `projects`, `users`, `accounts` e sessões já existentes. Esses arquivos foram removidos e substituídos por uma migração inicial que executa `CREATE TABLE` sem `IF NOT EXISTS`. Em um banco legado ela falha por tabela existente; se for considerada aplicada, `0001_project_repositories.sql` usa as novas colunas sem nenhum `ALTER TABLE ... ADD COLUMN` que as introduza. Portanto o catálogo e as atribuições existentes não têm um caminho de atualização, mesmo com todos os repositórios mapeados. A comparação com os arquivos de HEAD e a inspeção de todas as migrações confirmam a ausência desses ALTERs.

Preserve o histórico já entregue e acrescente uma migração incremental que introduza colunas inicialmente opcionais, permita carregar o manifesto verificado e então aplique backfill e restrições atomicamente. Inclua uma verificação com o esquema antigo preenchido, mantendo IDs, atribuições e sessões. Isso é exigido pelo ADR-005, task_01 e IT-066; uma instalação vazia não valida a atualização.

## Triage

- Decision: `VALID`
- Notes: As migrações de HEAD foram removidas e nenhuma expansão ALTER TABLE existe. Restaurar os dois arquivos legados, separar expansão nullable e finalização atômica, acrescentar preparação verificável e testar banco legado preenchido. Extensão mínima: journal/snapshot, CLI de preparação e documentação operacional para permitir interromper entre as fases.
- Escopo: rodada projects/reviews-001 completa; sem commit automático. Testes e dependências diretas das correções estão incluídos.
- Resolução: Histórico 0000/0001 restaurado; expansão nullable, staging verificado e constraints atômicas em 0003. Migração real preservou projeto, usuário, atribuição e sessão; backfill incompleto aborta sem dados parciais.

