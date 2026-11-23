---
status: completed
title: Captura dos artefatos
type: backend
complexity: high
---

# Task 04: Captura dos artefatos

## Visão geral
Quando o Claude termina a vez (`Stop`) ou a sessão acaba (`SessionEnd`), o Flow Dev lê do clone cada `.md` que uma skill editou desde a última captura. Se o conteúdo mudou, guarda uma nova versão do artefato no Postgres, sem atrasar a resposta ao hook. É a fatia de servidor da US-05 e a base das features futuras (P-08).

<critical>
- LEIA a spec (`spec.md`: US-05, REQ-042 a REQ-048, §7.8, B-17 a B-21, NFR-07, §16 "Capturar artefatos", §17 DEC-13 e DEC-14, §18 "Leitura de arquivos do clone", §19) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`). Leia a skill `layered-backend` e o guia `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-042: enquanto uma skill estiver ativa, todo `.md` dentro do clone que a sessão criar ou editar DEVE virar artefato da tarefa, atribuído a essa skill.
- REQ-043: no `Stop` ou no `SessionEnd`, DEVE ler o conteúdo atual de cada artefato tocado desde a última captura e guardar uma versão nova só se o conteúdo mudou.
- REQ-044: o artefato é identificado pela tarefa e pelo caminho relativo; sessões diferentes acrescentam versões ao mesmo artefato, cada uma com a sua skill e sessão.
- REQ-046: acima de 1 MB, arquivo ausente ou ilegível → nenhuma versão; o artefato mostra "Maior que 1 MB", "Arquivo não encontrado no clone" ou "Não foi possível ler o arquivo".
- REQ-047: artefatos e versões ficam guardados mesmo depois que a sessão acaba, o arquivo muda ou o vínculo local muda (B-21).
- REQ-048: fora do clone, sem `.md` no fim ou sem skill ativa → não vira artefato.
- §7.8:
  - o caminho é relativo à raiz do clone, depois de resolver links simbólicos;
  - um link para fora do clone não vira artefato;
  - as versões são sequenciais a partir de 1;
  - uma versão só existe se o conteúdo difere da anterior;
  - arquivo renomeado vira outro artefato.
- B-19: `Stop` seguido de `SessionEnd` gera no máximo uma versão por conteúdo.
- B-20: conteúdo igual ao de uma versão antiga, mas diferente da anterior, vira versão nova.
- NFR-07: a captura não atrasa o hook; o artefato aparece em até 5 s, com até 20 arquivos.
- §19: log `[terminal]` da captura com a sessão, quantos arquivos, quantas versões novas e as falhas com motivo, sem conteúdo.
- Não muda (§9): a captura só lê o clone; o status do planejamento, da tarefa, da fila e do quadro não muda; nada vai para o GitHub.

## Interfaces
- **Consome:**
  - da task_02: `taskArtifacts`, `taskArtifactVersions`, `MAX_ARTIFACT_BYTES`, `ArtifactCaptureTrigger`, `last_capture_at` na sessão;
  - da task_03: `TerminalEventController.ingest`, que devolve `{ captureTrigger }`; `POST /api/terminal-sessions/events` (`apps/web/src/app/api/terminal-sessions/events/route.ts`); `terminalEventComposition.ts`; `packages/api/test/terminal-event-support.ts`;
  - `task_terminal_events` com `kind = 'file_edit'`, `path` e `skill`.
- **Produz:**
  - `packages/api/src/application/terminal/checkoutFileReader.ts`:
    ```ts
    interface CheckoutFileReader { read(input: { checkoutPath: string; path: string }): Promise<CheckoutRead> }
    type CheckoutRead =
      | { kind: "content"; relativePath: string; content: string; byteSize: number }
      | { kind: "outside" }
      | { kind: "failed"; relativePath: string; reason: "too_large" | "not_found" | "unreadable" };
    ```
  - `packages/api/src/application/services/terminal/artifactFailureCopy.ts`: `ARTIFACT_FAILURE_MESSAGES`, com os textos exatos da REQ-046;
  - `packages/api/src/application/database/dao/artifactCaptureDao.ts`, `ArtifactCaptureDao`:
    - `withCaptureLock(sessionId, work)`, que trava a sessão;
    - `touchedSince(sessionId)`, que devolve `Array<{ path: string; skill: string }>` com os caminhos distintos e a skill do último `file_edit`;
    - `latestVersion(taskId, relativePath)`;
    - `appendVersion(...)`, `recordFailure(...)` e `markCaptured(sessionId, at)`;
  - `packages/api/src/application/services/terminal/artifactCaptureService.ts`: `ArtifactCaptureService.capture({ sessionId, trigger }): Promise<{ files: number; created: number; failures: number }>`;
  - `TerminalEventController.capture(sessionId: string, trigger: ArtifactCaptureTrigger): Promise<void>`, agendado pelo route handler com `after()`.

## Mini-tarefas

- [x] **04.1 — `CheckoutFileReader` com `realpath` e limites**
  - **Arquivos:**
    - criar `packages/api/src/application/terminal/checkoutFileReader.ts`;
    - criar `packages/api/src/infra/terminal/fsCheckoutFileReader.ts`;
    - criar `packages/api/test/checkout-file-reader.test.ts`, que usa um clone temporário real, links simbólicos e um arquivo de 1 MB + 1 byte.
  - **Testes:** V-16d, V-16e, V-17c, V-17d, V-17e, V-17k
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/checkout-file-reader.test.ts` passa.
  - **Nota:**
    - primeiro, um teste léxico: o `path.resolve(checkoutPath, path)` fora de `realpath(checkoutPath)` → `outside`;
    - depois, `realpath` do arquivo: `ENOENT` → `not_found`; resolvido fora do clone → `outside`;
    - em seguida, `stat`: acima de `MAX_ARTIFACT_BYTES` → `too_large`;
    - por fim, `readFile` em UTF-8: erro → `unreadable`;
    - nunca lê o arquivo antes de checar o tamanho.
- [x] **04.2 — `ArtifactCaptureService` e DAO de captura**
  - **Arquivos:**
    - criar `packages/api/src/application/database/dao/artifactCaptureDao.ts`;
    - criar `packages/api/src/infra/database/dao/artifacts/drizzleArtifactCaptureDao.ts` e `packages/api/src/infra/database/dao/artifacts/artifactVersionWrites.ts`;
    - criar `packages/api/src/application/services/terminal/artifactCaptureService.ts`, `packages/api/src/application/services/terminal/artifactCapturePlan.ts` (filtra `.md` e compara `sha256`) e `packages/api/src/application/services/terminal/artifactFailureCopy.ts`;
    - criar `packages/api/src/application/services/terminal/artifactCapturePlan.test.ts`;
    - criar `packages/api/test/artifact-capture.test.ts` e `packages/api/test/artifact-capture-support.ts`.
  - **Testes:** V-16a, V-16b, V-16c, V-16f, V-16g, V-16h, V-17a, V-17f, V-17g, V-17h
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/terminal/artifactCapturePlan.test.ts` e `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/artifact-capture.test.ts` passam; `pnpm --dir packages/api typecheck` sem erros.
  - **Nota:** siga o §16 "Capturar artefatos":
    1. com a sessão travada, lista os `file_edit` com `skill` não nula, `occurred_at > last_capture_at` (ou todos, se for nulo) e `path` terminando em `.md`;
    2. lê cada um com o `CheckoutFileReader` sobre o `checkout_path` da sessão;
    3. faz o upsert de `task_artifacts` e insere `version = latest_version + 1` se o `sha256` difere da última versão;
    4. grava `last_failure` se a leitura falhou, ou limpa o campo no sucesso (P-E);
    5. atualiza `last_capture_at`.
- [x] **04.3 — Captura no `Stop` e no `SessionEnd` com `after()`**
  - **Arquivos:**
    - alterar `packages/api/src/controllers/terminalEventController.ts` (método `capture` e log) e `packages/api/src/infra/terminalEventComposition.ts`;
    - alterar `apps/web/src/app/api/terminal-sessions/events/route.ts` (`after(() => controller.capture(sessionId, trigger))` quando `captureTrigger` não é nulo);
    - criar `packages/api/test/artifact-capture-flow.test.ts`.
  - **Testes:** V-17b, V-17i, V-17j, V-17l, V-20f, V-20g
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/artifact-capture-flow.test.ts test/terminal-event-route.test.ts` passa; `pnpm --dir apps/web typecheck` sem erros.
  - **Nota:**
    - no teste do route handler, `vi.mock("next/server", …)` substitui `after` por uma função que guarda os callbacks. O teste confere que a resposta `204` saiu antes de os callbacks rodarem, e depois os executa;
    - falhas da captura vão para o log e nunca derrubam o handler.

## Detalhes de implementação
- **Padrões a espelhar:**
  - arquivos do disco: `packages/api/src/infra/terminal/diskAttachmentFileStore.ts`;
  - transação com trava: `drizzleTerminalEventDao.ts` (task_03);
  - teste com clone real: `gitClone()` e `fingerprint()` em `packages/api/test/terminal-support.ts` e `packages/api/test/terminal-open-support.ts`;
  - "status inalterado": `rowsOf()` em `terminal-open-support.ts`.
- **Idempotência (B-19):** a captura roda dentro de `withCaptureLock` (`SELECT … FOR UPDATE` na sessão). A segunda captura vê `last_capture_at` novo e, se houver caminho em comum, o mesmo `sha256`.
- **Skill da versão:** a do último `file_edit` daquele caminho no intervalo (§16 passo 3).
- **Caminho guardado:** `relativePath` devolvido pelo leitor, depois do `realpath`. Se o clone foi trocado (B-21), a sessão nova usa o próprio `checkout_path`, e os artefatos antigos continuam pela chave (`task_id`, `relative_path`).

### Arquivos relevantes
- `apps/web/src/app/api/terminal-sessions/events/route.ts` (task_03): onde entra o `after()`.
- `packages/api/test/terminal-event-support.ts` (task_03): sessão aberta com token e `send(payload)`.
- `packages/api/src/infra/database/schema/tasks/artifacts.ts` (task_02).

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-12 (§17): o artefato pertence à skill ativa no momento da edição.
- DEC-13 (§17): o texto completo fica em `task_artifact_versions.content`.
- DEC-14 (§17): a captura acontece no fim da vez, depois de responder ao hook.

## Premissas
- P-D e P-E (`_tasks.md`): caminho absoluto fora do clone é ignorado sem criar artefato. `last_failure` guarda a mensagem pt-BR e é limpo no sucesso. Se a falha vier antes da primeira versão, o artefato fica com `latest_version = 0`.

## Testes atribuídos
- [x] V-16d: `file_edit` com skill ativa em `/tmp/x/nota.md` e em `<sessão>/contexto/anexos/01-nota.md` → leitor devolve `outside`; nenhum arquivo lido (B-18).
- [x] V-16e: `docs/link.md` é um link simbólico para um `.md` fora do clone → `outside`, conteúdo não lido (§7.8).
- [x] V-17c: `docs/grande.md` com 1 048 577 bytes → `failed`, `too_large`; com 1 048 576 bytes → `content`.
- [x] V-17d: caminho apagado depois da edição → `failed`, `not_found`.
- [x] V-17e: arquivo com `chmod 000` → `failed`, `unreadable`.
- [x] V-17k: `docs/atalho.md`, link para `docs/specs/x/spec.md` dentro do clone → `content` com `relativePath = docs/specs/x/spec.md`; um `checkout_path` que é ele mesmo um link simbólico também funciona.
- [x] V-16a: skill spec-writer ativa, `Write` em `docs/specs/login/spec.md` e captura → artefato `docs/specs/login/spec.md`, versão 1, com skill `spec-writer`, a sessão, `trigger = stop`, `byte_size` e `sha256` (US-05.1, REQ-042).
- [x] V-16b: `README.md` editado sem skill ativa → nenhum artefato; o evento `file_edit` continua lá (US-05.3, REQ-048).
- [x] V-16c: `src/app.ts` editado com skill ativa → nenhum artefato.
- [x] V-16f: na mesma vez, a.md com spec-writer e b.md com spec-to-tasks; c.md editado pelas duas, por último na spec-to-tasks → versões com as skills spec-writer, spec-to-tasks e spec-to-tasks (B-17).
- [x] V-16g: a sessão 1 gera as versões 1 e 2 de `spec.md` (spec-writer). A sessão 2 da mesma tarefa cria `_tasks.md` e edita `spec.md` com spec-to-tasks → `_tasks.md` v1 e `spec.md` v3, cada versão com a sua sessão e skill (US-05.2, US-05.4, REQ-044).
- [x] V-16h: conteúdos A, depois B, depois A de novo, em três capturas → versões 1 (A), 2 (B) e 3 (A) (B-20).
- [x] V-17a: captura sem mudança de conteúdo desde a última versão → nenhuma versão nova, e `last_capture_at` avança (REQ-043).
- [x] V-17f: captura com `docs/grande.md` acima de 1 MB → nenhuma versão; `last_failure = "Maior que 1 MB"`. Depois de reduzir o arquivo e capturar de novo → versão 1, com `last_failure` nulo (REQ-046, P-E).
- [x] V-17g: `spec.md` renomeado para `spec-v2.md` e editado com a skill ativa → artefato novo `spec-v2.md`, versão 1; o artefato `spec.md` continua com as suas versões (§7.8).
- [x] V-17h: a sessão 1 com o clone A gera `spec.md` v1. O vínculo muda para o clone B, e a sessão 2 edita `spec.md` com outro conteúdo → v2 lida do clone B; a v1 continua acessível (B-21, REQ-047).
- [x] V-17b: `Stop` e logo `SessionEnd`, com as duas capturas disparadas em paralelo (`Promise.all`) → uma versão por arquivo, sem erro de unique (B-19).
- [x] V-17i: POST de `Stop` no route handler → a resposta `204` sai antes de os callbacks do `after()` rodarem; depois de rodar os callbacks, a versão existe (DEC-14, NFR-07).
- [x] V-17j: 20 `.md` tocados com skill ativa e `Stop` → as 20 versões existem em até 5 s, contados do POST (NFR-07).
- [x] V-17l: uma captura com 3 arquivos, 2 versões novas e 1 falha → uma linha de log `[terminal]` com a sessão, `files: 3`, `created: 2` e a falha com motivo; nenhum trecho do conteúdo (§19).
- [x] V-20f: depois de ingestão e captura completas → `rowsOf(setup)` (tarefa, decisões de planejamento, claims) igual a antes (§9).
- [x] V-20g: depois da captura → `fingerprint(clone)` igual a antes, e o fake de GitHub sem chamadas (§9).

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Um `Stop` depois de a spec-writer escrever `docs/specs/x/spec.md` produz a versão 1 do artefato, sem atrasar o `204`.
- No fim da tarefa, `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passam.
- `pnpm --dir packages/api typecheck`, `pnpm --dir apps/web typecheck` e `pnpm lint` sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. Example:
- 2026-11-22 · 04.1 · leitor do clone · `vitest run --config vitest.integration.config.ts test/checkout-file-reader.test.ts` → 6 passed · sem desvios -->
- 2026-11-22 · 04.1 · `CheckoutFileReader` + `FsCheckoutFileReader` (léxico → realpath → stat → readFile) · `vitest run --config vitest.integration.config.ts test/checkout-file-reader.test.ts` → 6 passed (V-16d, V-16e, V-17c, V-17d, V-17e, V-17k) · sem desvios
- 2026-11-22 · 04.2 · `ArtifactCaptureService`, `ArtifactCaptureDao` (lock da sessão, `DISTINCT ON`, versão por incremento atômico), `artifactCapturePlan`, `artifactFailureCopy` · `vitest run src/application/services/terminal/artifactCapturePlan.test.ts` → 3 passed; `vitest run --config vitest.integration.config.ts test/artifact-capture.test.ts test/artifact-capture-history.test.ts` → 10 passed (V-16a/b/c/f/g/h, V-17a/f/g/h); typecheck sem erros · desvios: testes divididos em dois arquivos (limite de 100 linhas); `last_capture_at` guarda a marca d'água (maior `occurred_at` lido), não o relógio, e a ingestão passou a tomar o horário dentro da trava, para nenhum evento ficar para trás de uma captura
- 2026-11-22 · 04.3 · `TerminalEventController.capture` (falha só vai para o log), composição com o serviço de captura, `after()` no route handler · `vitest run --config vitest.integration.config.ts test/artifact-capture-flow.test.ts test/terminal-event-route.test.ts test/terminal-event-route-limits.test.ts` → 12 passed (V-17b, V-17i, V-17j, V-17l, V-20f, V-20g); `pnpm --dir apps/web typecheck` sem erros · desvio: `next/server` é mockado pelo caminho `apps/web/node_modules/next/server.js`, com os callbacks guardados em `terminal-event-route-support.ts`
- 2026-11-22 · fechamento · `pnpm --dir packages/api test` → 90 files, 593 passed; `test:integration` → 87 files, 504 passed; `pnpm lint` e typechecks sem erros
