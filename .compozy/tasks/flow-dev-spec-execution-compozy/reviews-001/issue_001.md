---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T10:34:24Z
status: resolved
file: packages/api/src/infra/spec/workspace/agentSnapshot.ts
line: 16
severity: critical
author: claude-code
provider_ref:
---

# Issue 001: Snapshot do agente segue symlinks e expõe arquivos do host

## Review Comment

`buildAgentSnapshot` lista os arquivos com `git ls-files -z` e copia cada um com `copyFile(join(checkoutPath, path), destination)`. O filtro `EXCLUDED` avalia apenas o **nome** do caminho versionado; `copyFile` segue symlinks e copia o conteúdo do alvo.

Um repositório conectado pode versionar um symlink com nome inofensivo (`docs/notes.txt -> /proc/self/cwd/../../apps/web/.env.local`, ou `-> ../../../<outroRepoId>/<outraTask>/checkout/src/segredo.ts`). O Git materializa o link no checkout, e o snapshot copia o arquivo real do host para `snapshot/`, que é montado como `/workspace/repository` no contêiner. A partir daí o conteúdo entra no contexto do agente, pode ser enviado ao provedor e pode aparecer em um documento capturado e exibido na Human View.

Impacto:

- Qualquer pessoa autora com um repositório sob seu controle lê arquivos do processo do worker (`DATABASE_URL`, `GITHUB_REPOSITORY_TOKEN_KEY`, `GITHUB_REPOSITORY_CLIENT_SECRET`) e checkouts privados de outros projetos sob `SPEC_WORKSPACE_ROOT`.
- Viola o TechSpec ("Secret files ... are excluded from the agent-visible mount", "No ... other workspace is mounted").

O mesmo padrão aparece em `packages/api/src/infra/spec/workspace/prepareCheckout.ts:72-78`: `measure` usa `stat` (segue symlinks), então um symlink quebrado ou apontando para diretório derruba o clone com `ENOENT`/`ELOOP` e a tentativa falha para qualquer repositório que tenha esse tipo de link, o que é comum.

Correção sugerida:

- Usar `lstat` em cada caminho e copiar somente arquivos regulares; ignorar symlinks ou recriá-los como links apenas quando o `realpath` do alvo permanecer dentro de `checkoutPath` e o alvo também passar por `isAgentVisible`.
- Trocar `stat` por `lstat` em `measure`.
- Adicionar teste com fixture de repositório contendo symlink absoluto, symlink relativo que escapa do checkout e symlink quebrado.

```ts
const stats = await lstat(source);
if (!stats.isFile()) continue;
await copyFile(source, destination, constants.COPYFILE_EXCL);
```

## Triage

- Decision: `VALID`
- Notes: Symlink traversal could copy host content into the agent mount. Snapshotting now accepts only lstat-confirmed regular files; checkout measurement ignores symlinks.
