---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T19:19:57Z
status: resolved
file: packages/api/src/application/services/projects/catalogImporter.ts
line: 33
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Verificar no GitHub as identidades usadas pela importação

## Review Comment

A CLI `packages/api/src/cli/catalogImport.ts` entrega o JSON diretamente ao `CatalogImporter`. A validação considera o repositório verificado apenas porque `githubId` e `nodeId` são strings e owner/name estão presentes. Nenhuma chamada ao GitHub confere identidade ou acesso administrativo. `upsertVerified` grava esses valores e `repositoryVerifiedAt` recebe a hora atual. Uma sondagem com `githubId: "made-up"` e `nodeId: "made-up"` foi aceita e passada ao DAO. As restrições SQL também não validam a existência do repositório, logo esse caminho pode criar projetos com origem fictícia ou vínculo incorreto.

Exija um administrador autorizado e resolva todas as entradas no GitHub antes da transação, construindo as identidades a partir das respostas confirmadas. Se essa capacidade não estiver disponível, desative a importação operacional. Não aceite IDs declarados pelo manifesto como prova de verificação. A regra vale também para a preparação do backfill, conforme PRD regras 1/5 e ADR-005.

## Triage

- Decision: `VALID`
- Notes: O importer confia em strings fornecidas pelo manifesto. Exigir administrador persistido e credencial pessoal, resolver todas as entradas pelo gateway antes de qualquer escrita e reaproveitar a verificação no backfill. Extensão mínima: serviço de verificação, composição/CLI e DAO de staging.
- Escopo: rodada projects/reviews-001 completa; sem commit automático. Testes e dependências diretas das correções estão incluídos.
- Resolução: Importação exige administrador e autorização pessoal, consulta todo node ID no GitHub antes da transação e compara databaseId. Backfill reutiliza o verificador. Testes rejeitam IDs inventados, conta sem admin e falha numa entrada sem gravar.

