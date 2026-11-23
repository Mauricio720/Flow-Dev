---
status: pending
title: Leitura do conjunto de tarefas
type: backend
complexity: medium
---

# Task 02: Leitura do conjunto de tarefas

## Visão geral
O conjunto de tarefas não tem tabela própria (DEC-22). Esta tarefa cria os leitores puros que interpretam a versão mais recente do `_tasks.md` e dos `task_NN.md` capturados pela Spec B (regras 7.2 e 7.3), e a procedure `tasks.taskSet.get`. Ela devolve as specs da tarefa (7.1), o conjunto ativo com o estado de cada tarefa e o motivo quando o manifesto é inválido. É a base da tela (task_07), do plano (task_04) e dos prompts (task_05).

<critical>
- LEIA a spec (`docs/specs/tarefas-e-plano-de-execucao/spec.md`, §6 REQ-085–091, §7.1–7.3, §8 B-32–B-34, §15, §16 "Ler o conjunto", DEC-22, DEC-27) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use as skills `layered-backend` e `trpc-nextjs`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- 7.3 / REQ-090: manifesto válido = frontmatter com `schema_version: "compozy.tasks/v2"`, `graph.nodes` com `{ id: task_NN, file: task_NN.md }` e ids únicos, `graph.edges` só com nós existentes e sem ciclos, de 1 a 30 tarefas. Os motivos são exatamente: "o frontmatter está ausente ou inválido", "o grafo de tarefas está ausente", "a tarefa <id> aparece mais de uma vez", "a dependência <de> → <para> cita uma tarefa inexistente", "as dependências formam um ciclo", "há mais de 30 tarefas".
- 7.2: `pending` → `pending`; `in_progress` → `in_progress`; `completed`, `done`, `finished` → `completed`; ausente, outro valor ou arquivo não capturado → `unknown`. Mini-tarefas são as linhas `- [ ]` e `- [x]` que começam um item na seção `## Mini-tarefas`. O status vem só do frontmatter (B-34), e a tabela "Estado" do `_tasks.md` não é lida (B-33).
- REQ-087: tarefas na ordem do manifesto, com número, título, tipo, complexidade, dependências, mini-tarefas concluídas sobre o total e status.
- REQ-089: tudo vem da versão mais recente capturada de cada arquivo.
- REQ-091: tarefa do manifesto sem arquivo capturado → `title: null`, `status: "unknown"`, `artifactId: null`.
- REQ-086 / B-32: o conjunto vale para qualquer `_tasks.md` capturado, de qualquer sessão. Com dois `_tasks.md` em pastas diferentes, vale o da pasta cuja versão mais recente foi capturada por último, e `otherFolders` lista as outras.
- 7.1 / REQ-085: uma spec capturada é um artefato chamado `spec.md` com ao menos uma versão da skill `spec-writer`. `specs` vem ordenada pela captura da versão mais recente, da mais nova para a mais velha.
- DEC-27: `yaml` como dependência direta de `packages/api`, com versão fixada (sem `^`), usado só no frontmatter.
- §19: manifesto inválido gera log `[plan]` com o motivo.
- §18: leitura exige acesso de leitura ao projeto e a tarefa no projeto (como `TaskArtifactController`).

## Interfaces
- **Consome:** as tabelas `task_artifacts` e `task_artifact_versions` (`packages/api/src/infra/database/schema/tasks/artifacts.ts`); `RepositoryAccessService.requireRead`; o padrão de `TaskArtifactController` (`src/controllers/taskArtifactController.ts`), `DrizzleArtifactReadDao` (`src/infra/database/dao/artifacts/drizzleArtifactReadDao.ts`), `createArtifactsRouter` (`src/routers/artifacts.ts`) e `src/infra/artifactComposition.ts`.
- **Produz** (usado pelas tasks 04, 05, 06 e 07):
  - `src/application/services/tasks-set/taskSetTypes.ts`:
    ```ts
    export type TaskStatus = "pending" | "in_progress" | "completed" | "unknown";
    export type TaskSetTask = { id: string; number: string; title: string | null; type: string | null; complexity: string | null; dependsOn: string[]; status: TaskStatus; miniDone: number; miniTotal: number; artifactId: string | null; path: string | null };
    export type TaskSet = { folder: string; manifestArtifactId: string; manifestVersion: number; problem: string | null; otherFolders: string[]; tasks: TaskSetTask[] };
    export type SpecRef = { artifactId: string; path: string; updatedAt: string };
    ```
  - `parseManifest(content: string): { nodes: ManifestNode[]; edges: ManifestEdge[]; problem: null } | { problem: string }` em `taskManifestParser.ts`;
  - `parseTaskFile(content: string): { title: string | null; type: string | null; complexity: string | null; status: TaskStatus; miniDone: number; miniTotal: number }` em `taskFileParser.ts`;
  - `readTaskSet(input: TaskSetSource): TaskSet` em `taskSetReader.ts`;
  - a porta `TaskSetReadDao` em `src/application/database/dao/taskSetReadDao.ts` com `taskInProject`, `specs(taskId)`, `manifests(taskId)` e `folderFiles(taskId, folder)`;
  - `TaskSetController.get(actor, { projectId, taskId }) → { specs: SpecRef[]; set: TaskSet | null }` e a procedure `tasks.taskSet.get`, no formato da spec §15 (o campo `path` em cada tarefa é o caminho relativo do `task_NN.md`, usado nos prompts da task_05).

## Mini-tarefas

- [ ] **02.1 — `yaml` e o parser do manifesto (7.3)**
  - **Arquivos:** `packages/api/package.json` (`yaml` na última 2.x publicada há mais de duas semanas, sem `^`) e `pnpm-lock.yaml`, `packages/api/src/application/services/tasks-set/taskSetTypes.ts`, `frontmatter.ts`, `taskManifestParser.ts`, `manifestGraph.ts` (ids repetidos, arestas órfãs e ciclo) e `taskManifestParser.test.ts` (criar)
  - **Testes:** V-34a, V-34b, V-34c, V-34d, V-34e, V-34f, V-34g
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/tasks-set/taskManifestParser.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
- [ ] **02.2 — Parser da tarefa (7.2) e o leitor do conjunto**
  - **Arquivos:** `packages/api/src/application/services/tasks-set/taskFileParser.ts`, `taskFileParser.test.ts`, `taskSetReader.ts` e `taskSetReader.test.ts` (criar)
  - **Testes:** V-34h, V-34i, V-34j, V-34k, V-34l
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/tasks-set/taskFileParser.test.ts src/application/services/tasks-set/taskSetReader.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
- [ ] **02.3 — `TaskSetReadDao`, `TaskSetController` e `tasks.taskSet.get`**
  - **Arquivos:** `packages/api/src/application/database/dao/taskSetReadDao.ts` (criar), `packages/api/src/infra/database/dao/artifacts/drizzleTaskSetReadDao.ts` (criar), `packages/api/src/controllers/taskSetController.ts` (criar), `packages/api/src/schemas/taskSet.ts` (criar), `packages/api/src/routers/taskSet.ts` (criar), `packages/api/src/routers/tasks.ts` (montar `taskSet` e aceitar `extras.taskSet`), `packages/api/src/infra/taskSetComposition.ts` (criar), `packages/api/test/task-set-read.test.ts` (criar)
  - **Testes:** V-34m, V-34n, V-34o, V-34p, V-34q
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/task-set-read.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
- `frontmatter.ts` separa o bloco `---` inicial e chama `parse` do `yaml`. YAML inválido, bloco ausente, ou `schema_version` diferente de `"compozy.tasks/v2"` → "o frontmatter está ausente ou inválido". Um nó cujo `id` não casa `^task_\d{2}$`, ou cujo `file` não é `<id>.md`, também cai nesse motivo; isso impede caminhos como `../x.md` (Foco de revisão 1).
- Ordem das checagens do manifesto (o primeiro problema vence): frontmatter → grafo ausente (`graph` ou `graph.nodes` ausente ou vazio) → mais de 30 → id repetido → aresta órfã → ciclo.
- `number` é o sufixo do id (`task_02` → `"02"`). `dependsOn` vem das arestas com `to` igual ao id, em ordem de número.
- `title`, `type` e `complexity` vêm do frontmatter do `task_NN.md`.
- Na contagem de mini-tarefas, só conta o item que começa a linha na seção `## Mini-tarefas`, até o próximo `## `. Caixas em sub-itens indentados e em outras seções (como "Testes atribuídos") não contam.
- O `DrizzleTaskSetReadDao` traz a versão mais recente de cada artefato do jeito que `DrizzleArtifactReadDao.get` faz, mas filtrado por caminho:
  - `manifests`: caminho igual a `_tasks.md` ou terminado em `/_tasks.md`;
  - `folderFiles`: `<pasta>/task_NN.md`;
  - `specs`: `spec.md` ou terminado em `/spec.md`, com ao menos uma versão `skill = 'spec-writer'`.

  Devolva `capturedAt` da versão mais recente, para a escolha da B-32 e a ordem da 7.1.
- O controller lê os manifestos, escolhe o mais recente, lê os arquivos da pasta e chama `readTaskSet`. Com manifesto inválido, devolve `set` com `problem` e `tasks: []`, e registra `[plan] manifest_invalid` com o motivo e a pasta.
- Os testes de integração usam `seedArtifact` (`test/terminal-execution-support.ts`) e `terminalHarness` (`test/terminal-harness.ts`), como `test/task-artifacts-contract.test.ts`.

### Arquivos relevantes
- `packages/api/src/infra/database/dao/artifacts/drizzleArtifactReadDao.ts`: consulta da versão mais recente.
- `packages/api/src/controllers/taskArtifactController.ts`: autorização de leitura a espelhar.
- `packages/api/test/task-artifacts-contract.test.ts`: montagem de mundo com artefatos.
- `.claude/skills/spec-to-tasks/references/manifest-template.md` e `task-template.md`: o formato que o leitor interpreta (P-15).

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-22 (spec §17): sem tabela de tarefas; o estado é calculado a cada leitura.
- DEC-27: `yaml` fixado, só para o frontmatter.

## Premissas
- `graph.nodes` vazio usa o motivo "o grafo de tarefas está ausente" (`_tasks.md`, "Premissas e bloqueios").

## Testes atribuídos
- [ ] V-34a: manifesto v2 com `task_01`, `task_02`, `task_03` e as arestas `01→02`, `01→03` → três nós na ordem do arquivo, sem problema; `task_02` com `dependsOn: ["task_01"]` · função pura
- [ ] V-34b: conteúdo sem `---`; YAML quebrado; `schema_version: "compozy.tasks/v1"`; nó `{ id: task_01, file: ../x.md }` → "o frontmatter está ausente ou inválido" nos quatro · função pura
- [ ] V-34c: frontmatter válido sem `graph`, e com `graph.nodes: []` → "o grafo de tarefas está ausente" · função pura
- [ ] V-34d: `task_02` duas vezes em `nodes` → "a tarefa task_02 aparece mais de uma vez" · função pura
- [ ] V-34e: aresta `task_01 → task_09` sem o nó `task_09` → "a dependência task_01 → task_09 cita uma tarefa inexistente" · função pura
- [ ] V-34f: arestas `01→02`, `02→03`, `03→01` → "as dependências formam um ciclo" · função pura
- [ ] V-34g: 31 nós → "há mais de 30 tarefas"; 30 nós → válido · função pura
- [ ] V-34h: `status` `pending`, `in_progress`, `completed`, `done`, `finished`, `blocked` e ausente → `pending`, `in_progress`, `completed`, `completed`, `completed`, `unknown`, `unknown` · função pura
- [ ] V-34i: `## Mini-tarefas` com `- [x]`, `- [ ]`, `- [x]` e um sub-item indentado `  - [ ]`, mais `- [ ]` em `## Testes atribuídos` → `miniDone: 2`, `miniTotal: 3` · função pura
- [ ] V-34j: `status: completed` com 2 de 3 mini-tarefas marcadas → `completed` e 2/3, sem inferir nada (B-34) · função pura
- [ ] V-34k: `_tasks.md` com a tabela "Estado" dizendo `completed` para a 02 e `task_02.md` com `status: pending` → a 02 sai `pending` (B-33) · `readTaskSet` puro
- [ ] V-34l: manifesto com `task_03` e nenhum `task_03.md` → `title: null`, `status: "unknown"`, `artifactId: null`, `miniTotal: 0` (REQ-091) · `readTaskSet` puro
- [ ] V-34m: `docs/specs/login/_tasks.md` com 3 tarefas e `task_02.md` com a versão 1 `pending` e a versão 2 `completed` → `taskSet.get` devolve a 02 `completed`, `manifestVersion` igual à última versão do `_tasks.md`, e `path: "docs/specs/login/task_02.md"` (REQ-089) · controller + Postgres
- [ ] V-34n: `_tasks.md` em `docs/specs/old/` capturado às 10:00 e em `docs/specs/login/` às 11:00 → `folder: "docs/specs/login"`, `otherFolders: ["docs/specs/old"]` (B-32) · controller + Postgres
- [ ] V-34o: `docs/specs/a/spec.md` (spec-writer, 10:00), `docs/specs/b/spec.md` (spec-writer, 11:00) e `docs/specs/c/spec.md` só com versões `spec-to-tasks` → `specs` com `b` e depois `a`, sem `c` (7.1) · controller + Postgres
- [ ] V-34p: tarefa sem nenhum `_tasks.md` → `set: null`; manifesto sem `graph` → `set.problem` "o grafo de tarefas está ausente", `tasks: []` e log `[plan]` com o motivo · controller + Postgres
- [ ] V-34q: pessoa sem acesso ao projeto → recusada como em `tasks.artifacts.list`; membro com acesso → lê o conjunto; `taskId` de outro projeto → `task_unavailable` · controller + Postgres

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passando ao fim da tarefa.
- `pnpm --dir packages/api typecheck` sem erros; `yaml` sem `^` no `package.json`.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->
