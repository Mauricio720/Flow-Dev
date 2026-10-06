---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T10:34:24Z
status: resolved
file: packages/api/src/infra/spec/workspace/candidateFreeze.ts
line: 43
severity: high
author: claude-code
provider_ref:
---

# Issue 007: Freeze lê o candidato com o contêiner ativo e sem limite prévio

## Review Comment

`freezeCandidate` não congela nada: `finalizeOnDone` chama o freeze logo após um evento de término, sem verificar a liquidação da sessão, sem parar o contêiner e sem lock de workspace (não há nenhum lock em `infra/spec/`). O diretório continua montado em escrita no contêiner enquanto o host o lê.

Dois problemas decorrem disso:

1. **TOCTOU com symlink.** `listFiles` valida cada entrada com `lstat` (regular, `nlink === 1`), mas a leitura acontece depois, em outra chamada: `readFile(join(candidatePath, path))`, que segue symlinks. Um processo no contêiner pode trocar `_prd.md` por um link para um caminho absoluto do host entre as duas chamadas. O conteúdo lido é salvo em `task_spec_documents.source_text` (mesmo em pacote `partial`) e servido por `taskSpec.document`. É uma leitura de arquivo do host a partir de um agente comprometido por conteúdo do repositório.
2. **Leitura sem limite.** O tamanho só é comparado **depois** de `readFile` carregar o arquivo inteiro. Os bind mounts de `candidate/` e `/var/lib/compozy` não têm quota (só o `tmpfs` de `/tmp` tem `size=2g`), então o agente pode escrever arquivos de vários GiB: o worker estoura memória, ou recebe `ERR_FS_FILE_TOO_LARGE`, que não é `TaskError` e cai no problema da issue 003.

O TechSpec pede, no passo 1 da finalização, "Verify actual provider settlement, freeze candidate writes, acquire the workspace lock", e no passo 2, "Read bounded regular UTF-8 files; reject symlinks/hardlinks".

Correção sugerida:

- Antes do freeze, confirmar a sessão liquidada e parar o contêiner (ou remontar o candidato como somente leitura).
- Abrir cada arquivo com `O_RDONLY | O_NOFOLLOW`, fazer `fstat` no descritor (regular, `nlink === 1`, `size <= SPEC_DOCUMENT_MAX_BYTES`) e ler do mesmo descritor.
- Acumular o total a partir do `fstat` e abortar com `package_limit` antes de ler.

```ts
const handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
const stats = await handle.stat();
if (!stats.isFile() || stats.nlink !== 1) throw INVALID();
if (stats.size > SPEC_DOCUMENT_MAX_BYTES) throw LIMIT();
```

## Triage

- Decision: `VALID`
- Notes: Candidate reads were vulnerable to a validation/read race and unbounded reads. Files are now opened no-follow, verified from the descriptor, and size-checked before reading.
