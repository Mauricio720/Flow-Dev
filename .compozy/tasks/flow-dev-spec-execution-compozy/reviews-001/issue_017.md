---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T10:34:24Z
status: resolved
file: packages/api/src/infra/database/dao/spec/specPackageReads.ts
line: 54
severity: medium
author: claude-code
provider_ref:
---

# Issue 017: Leitura de documento recarrega o pacote inteiro a cada página

## Review Comment

`readSpecDocument` chama `readSpecPackage` apenas para validar o escopo. Essa função:

- carrega **todas** as colunas de todos os documentos do pacote, incluindo `source_text` e `blocks` (até 8 MiB por pacote);
- carrega os documentos do pacote pai;
- monta as seções de cada documento e calcula `specPackageDiff`.

O resultado é descartado. Em seguida a função busca o documento pedido e devolve `sourceText` completo (até 1 MiB) junto com a página de blocos.

No cliente, `fetchPackage` chama `taskSpec.package` uma vez e depois `taskSpec.document` para cada documento em paralelo; `loadMore` repete a chamada a cada página de 100 blocos. Para um pacote de Tasks no limite (200 arquivos), abrir a revisão dispara 200 leituras, e cada uma carrega do banco os 200 documentos com seus fontes. O custo é quadrático no número de documentos, e o fonte completo é retransmitido a cada página de blocos.

O TechSpec fixa "package-index response below 1 second for maximum supported metadata" e define `taskSpec.document` como "Full untruncated source **or** paged blocks".

`readSpecPackage` também seleciona `source_text` sem necessidade: o detalhe do pacote usa apenas `blocks` e metadados.

Correção sugerida:

- Em `readSpecDocument`, validar o escopo com uma consulta leve (join `task_spec_documents` → `task_spec_packages` filtrando `workflow_id`), sem montar o pacote.
- Devolver `sourceText` somente na primeira página (sem cursor) ou em um modo `source` explícito.
- Em `readSpecPackage`, selecionar apenas as colunas usadas (`id`, `path`, `role`, `sha256`, `byteCount`, `blocks`).
- Teste de integração com pacote de 200 tarefas medindo o número de consultas ou o tempo.

## Triage

- Decision: `VALID`
- Notes: Document reads rebuilt the complete package only to authorize scope. They now validate package ownership through a targeted document/package join.
