---
status: completed
title: Regras e gateways do GitHub com status de destino e responsável
type: backend
complexity: medium
---

# Task 01: Regras e gateways do GitHub com status de destino e responsável

## Visão geral
Prepara as peças puras e de integração que a publicação vai usar: a regra que decide se a opção pode ser cumprida, o contrato do quadro com status de destino (DEC-03), o serviço do quadro renomeado e o gateway de Issues que envia o responsável e devolve os responsáveis no recibo (DEC-01). Nada aqui muda o comportamento visível: sem a opção, tudo continua igual.

<critical>
- LEIA a spec (`spec.md`, principalmente §7, §13, §15 e §17) e as regras do projeto (AGENTS.md, `.claude/rules/code-standards.md`) antes de começar. Use a skill `layered-backend`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- RN-03: a coluna Ready é a opção do campo Status cujo nome, sem espaços nas pontas e sem diferenciar maiúsculas, é "Ready". A publicação e a fila Ready DEVEM usar a mesma função (DEC-03, risco "regra diverge").
- RN-04 e RN-05: a regra DEVE devolver o primeiro motivo na ordem quadro → Ready → escrita, ou `null`.
- REQ-005 (parte pura): faltando quadro, Ready ou escrita, a regra devolve `ready_board_missing`, `ready_status_missing` ou `assign_permission_denied`.
- B-06: Ready sem In Progress não é motivo de recusa.
- DEC-03: `statuses()` e `place({ status })` substituem `assertBacklog` e `placeInBacklog`, e a prioridade continua gravada. `resolve` continua exigindo Backlog e lançando `BacklogStatusMissingError`.
- REQ-003 (parte do gateway): `place(ready)` usa o id da opção Ready e grava os pontos de prioridade.
- DEC-01: com `assignees`, o corpo do `POST /repos/{owner}/{repo}/issues` leva `assignees: [login]`; sem ele, o corpo é idêntico ao de hoje. O recibo traz `assigneeGithubIds` a partir de `assignees[].id` da resposta 201.
- Não muda (§9): o vínculo do quadro exige só Backlog, a correção em lote coloca em Backlog, e `place(backlog)` envia as mesmas mutations de hoje.

## Interfaces
- **Consome:** `findStatusOption` (hoje privada) em `projectBoardRules.ts`; `findOption` e `READY_STATUS_NAME` em `assignedIssueRules.ts`; `BoardNode` e as queries em `infra/github/projectBoardQueries.ts`; `IssueEligibility.canWriteContents`.
- **Produz** (a task_03 consome estes nomes exatamente):
  - `application/services/tasks/readyAssignmentRules.ts`:
    ```ts
    export type ReadyRefusal = "ready_board_missing" | "ready_status_missing" | "assign_permission_denied";
    export type ReadyFacts = { hasBoard: boolean; statuses: BoardStatus[]; canWriteContents: boolean };
    export function readyRefusal(facts: ReadyFacts): ReadyRefusal | null;
    ```
  - `application/services/projects/projectBoardRules.ts`: `export function findReadyOption(options: StatusOption[]): StatusOption | null`, usada também por `assignedIssueRules.ts` no lugar da busca própria por "ready".
  - `application/github/projectBoardGateway.ts`:
    ```ts
    export type BoardStatus = "backlog" | "ready";
    export class BoardStatusMissingError extends Error { constructor(readonly status: BoardStatus) { super(status); } }
    export interface GitHubProjectBoardGateway {
      resolve(token: string, reference: BoardReference): Promise<ProjectBoard>;
      statuses(token: string, boardNodeId: string): Promise<BoardStatus[]>;
      place(token: string, item: BacklogItem & { status: BoardStatus }): Promise<void>;
      issuePresence(token: string, target: BoardItemTarget): Promise<IssuePresence>;
    }
    ```
  - `application/services/projects/boardPlacementService.ts` (substitui `backlogPlacementService.ts`):
    ```ts
    export type BoardPlacement = "placed" | "no_board";
    export class BoardPlacementService {
      statuses(scope: { projectId: string; token: string }): Promise<BoardStatus[] | null>; // null = projeto sem quadro
      assertAuthorized(scope: { projectId: string; token: string }): Promise<void>;     // comportamento atual: só relança RepositoryAuthorizationNeededError
      place(scope: { projectId: string; token: string; issueNodeId: string; priorityPoints?: number | null; status: BoardStatus }): Promise<BoardPlacement>; // 2 tentativas
    }
    ```
  - `application/github/issueGateway.ts`: `ApprovedIssueRequest` ganha `assignees?: string[]`; `IssueReceipt` ganha `assigneeGithubIds: string[]`.

## Mini-tarefas

- [x] **01.1 — Regra da opção e nome Ready único**
  - **Arquivos:** `packages/api/src/application/services/tasks/readyAssignmentRules.ts` (criar), `packages/api/src/application/services/tasks/readyAssignmentRules.test.ts` (criar), `packages/api/src/application/services/projects/projectBoardRules.ts` (exportar `findReadyOption`), `packages/api/src/application/services/assigned-issues/assignedIssueRules.ts` (usar `findReadyOption` em vez de `findOption(..., READY_STATUS_NAME)` onde a fila procura Ready), `packages/api/src/application/services/projects/projectBoard.test.ts` (caso V-01d)
  - **Testes:** V-01a, V-01b, V-01c, V-01d, V-01e, V-01f, V-01g
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/tasks/readyAssignmentRules.test.ts src/application/services/projects/projectBoard.test.ts src/application/services/assigned-issues/assignedIssueRules.test.ts` passa
  - **Nota:** `readyAssignmentRules.ts` importa só o tipo `BoardStatus`. Se o tipo ainda não existir, declare-o já em `projectBoardGateway.ts` nesta mini-tarefa (a 01.2 só o reaproveita). Procure todos os usos de "ready" na fila (`rtk grep -n "READY_STATUS_NAME" packages/api/src`) antes de trocar.
- [x] **01.2 — Contrato e gateway do quadro com status de destino**
  - **Arquivos:** `packages/api/src/application/github/projectBoardGateway.ts`, `packages/api/src/infra/github/githubProjectBoardGateway.ts`, `packages/api/src/infra/github/githubProjectBoardGateway.test.ts`
  - **Testes:** V-02a, V-02b, V-02c, V-02d
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/github/githubProjectBoardGateway.test.ts` passa, com os testes atuais do Backlog mudando só o nome do método chamado
  - **Nota:** troque `backlogTarget` por uma função `statusTarget(board, status)` que usa `findBacklogOption` ou `findReadyOption` e lança `BoardStatusMissingError(status)`. `resolve` continua chamando a verificação do Backlog e lançando `BacklogStatusMissingError`. O comentário existente sobre `addProjectV2ItemById` fica. Os chamadores (`backlogPlacementService.ts`, `boardBackfillService.ts`) só compilam depois da 01.3: faça as duas na mesma sessão ou rode só o teste do gateway aqui.
- [x] **01.3 — Serviço do quadro com status pedido e correção em lote**
  - **Arquivos:** `packages/api/src/application/services/projects/backlogPlacementService.ts` → `boardPlacementService.ts` (renomear com `git mv`), `packages/api/src/application/services/projects/boardBackfillService.ts` (`place({ ..., status: "backlog" })`), `packages/api/src/infra/composition.ts` (`createBacklogPlacementService` → `createBoardPlacementService`), `packages/api/src/controllers/taskPublicationController.ts` e `packages/api/src/controllers/taskPublicationWorkerController.ts` (só o tipo e a chamada `place({ ..., status: "backlog" })`; a opção entra na task_03), `packages/api/src/application/services/projects/projectBoard.test.ts`
  - **Testes:** V-11a
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/projects/projectBoard.test.ts src/controllers/taskPublicationWorkerController.test.ts src/application/services/assigned-issues` passa e `pnpm --dir packages/api typecheck` não tem erros
  - **Nota:** `statuses(scope)` devolve `null` sem quadro e propaga os erros do gateway; `assertAuthorized` passa a usar `statuses` e mantém o comportamento de hoje (só relança `RepositoryAuthorizationNeededError`). Os testes atuais mudam só nomes (V-11a).
- [x] **01.4 — Gateway de Issues com responsável e recibo com responsáveis**
  - **Arquivos:** `packages/api/src/application/github/issueGateway.ts`, `packages/api/src/infra/github/githubIssueGateway.ts`, `packages/api/src/infra/github/githubIssueReceipt.ts` (criar, com `receipt`, `isExpectedIssueUrl` e a leitura de `assignees`), `packages/api/src/infra/github/githubIssueGateway.test.ts`, mais os dublês de `IssueReceipt` que deixarem de compilar (`packages/api/test/task-publication-case.ts` e testes unitários que montam recibo: acrescente `assigneeGithubIds: []`)
  - **Testes:** V-03a, V-03b, V-03c, V-03d
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/github/githubIssueGateway.test.ts` passa e `pnpm --dir packages/api typecheck` não tem erros
  - **Nota:** `githubIssueGateway.ts` já tem 100 linhas: mova o recibo para `githubIssueReceipt.ts` antes de acrescentar. `assignees` ausente ou com item sem `id` numérico/string → `assigneeGithubIds: []` para esse item (não invalida o recibo, porque a Issue foi criada).

## Detalhes de implementação
Espelhe os testes atuais de `githubProjectBoardGateway.test.ts` e `githubIssueGateway.test.ts`: cliente real com `fetch` controlado, asserção sobre o corpo enviado e sobre o retorno. Para a regra pura, siga `assignedIssueRules.test.ts`.

### Arquivos relevantes
- `packages/api/src/application/services/projects/projectBoardRules.ts`: `findStatusOption` (privada) já faz trim + minúsculas; `findReadyOption` é a mesma busca com "ready".
- `packages/api/src/application/services/assigned-issues/assignedIssueRules.ts:7,46`: `READY_STATUS_NAME` e `findOption`, a regra duplicada citada em DEC-03.
- `packages/api/src/infra/github/githubProjectBoardGateway.ts`: `backlogTarget`, `setStatus`, `setPriority`.
- `packages/api/src/infra/github/githubIssueGateway.ts:80`: `issuePayload` monta o corpo de hoje; `:89` `receipt`.
- `packages/api/src/controllers/projectsController.ts:50`: mapeamento de `BacklogStatusMissingError`, que não muda.

### Arquivos afetados
- Ver "Arquivos" de cada mini-tarefa.

### Decisões relacionadas
- DEC-01 (spec §17): responsável no pedido de criação.
- DEC-03 (spec §17): contrato do quadro com status de destino e uma só regra do nome Ready.

## Premissas
- Ninguém fora de `packages/api` usa `BacklogPlacementService`, `assertBacklog` ou `placeInBacklog` (conferido em 2026-11-25 com grep; refaça antes de renomear).

## Testes atribuídos
- [ ] V-01a: `readyRefusal({ hasBoard: false, statuses: [], canWriteContents: true })` → `"ready_board_missing"` · função pura
- [ ] V-01b: quadro com `["backlog"]` e escrita → `"ready_status_missing"` · função pura
- [ ] V-01c: quadro com `["backlog", "ready"]` e `canWriteContents: false` → `"assign_permission_denied"` · função pura
- [ ] V-01d: `findReadyOption` com opções `" Ready "` e `"ready"` encontra a opção; com só `"Pronto"` devolve `null`; a fila (`assignedIssueRules`) usa a mesma função · função pura
- [ ] V-01e: sem quadro e sem escrita → `"ready_board_missing"`; quadro sem Ready e sem escrita → `"ready_status_missing"` (a primeira falta na ordem de RN-05) · função pura
- [ ] V-01f: quadro com `["backlog", "ready"]` sem In Progress e com escrita → `null` (B-06) · função pura
- [ ] V-01g: quadro com Ready e escrita → `null` · função pura
- [ ] V-02a: `statuses` num quadro com opções Backlog, Ready e In Progress → `["backlog", "ready"]`; num quadro só com Backlog → `["backlog"]` · gateway real, fetch controlado
- [ ] V-02b: `place({ status: "ready", priorityPoints: 5 })` → a mutation de status usa o id da opção Ready (não o do Backlog) e a de prioridade envia 5 · gateway real, fetch controlado
- [ ] V-02c: `place({ status: "backlog" })` → envia as mesmas mutations, na mesma ordem e com as mesmas variáveis que o `placeInBacklog` de hoje · gateway real, fetch controlado
- [ ] V-02d: `place({ status: "ready" })` num quadro sem Ready → `BoardStatusMissingError` com `status === "ready"`, sem mutation enviada; `resolve` num quadro sem Backlog continua lançando `BacklogStatusMissingError` · gateway real, fetch controlado
- [ ] V-03a: `create` sem `assignees` → o corpo JSON enviado é exatamente `{ title, body, labels }` de hoje, sem a chave `assignees` · gateway real, fetch controlado
- [ ] V-03b: `create` com `assignees: ["ana"]` → o corpo enviado tem `assignees: ["ana"]` · gateway real, fetch controlado
- [ ] V-03c: resposta 201 com `assignees: [{ id: 88, login: "ana" }]` → `receipt.assigneeGithubIds` é `["88"]` · gateway real, fetch controlado
- [ ] V-03d: resposta 201 com `assignees: []` → `status: "created"` e `assigneeGithubIds` é `[]` · gateway real, fetch controlado
- [ ] V-11a: `projectBoard.test.ts` (Backlog, vínculo e correção em lote) e os testes de `assigned-issues` passam, mudando só nomes de método e de classe · testes existentes

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Não sobra referência a `assertBacklog`, `placeInBacklog` nem `BacklogPlacementService` em `packages/api/src`.
- Typecheck de `packages/api` sem erros; nenhum arquivo acima de 100 linhas; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data · mini-tarefa · o que foi feito · comandos e resultado · desvios. -->
- 2026-11-25 · 01.1 · Adicionada a regra ordenada da opção, a busca compartilhada de Ready e testes V-01a–V-01g; a fila passa a usar a mesma busca. · `pnpm --dir packages/api exec vitest run src/application/services/tasks/readyAssignmentRules.test.ts src/application/services/projects/projectBoard.test.ts src/application/services/assigned-issues/assignedIssueRules.test.ts` → passou (3 arquivos, 24 testes). · Sem desvios.
- 2026-11-25 · 01.2 · Gateway agora lista e aplica Backlog/Ready, mantendo validação de Backlog no vínculo e prioridade; adicionados casos de gateway controlado. · `pnpm --dir packages/api exec vitest run src/infra/github/githubProjectBoardGateway.test.ts` → passou (1 arquivo, 10 testes). · Sem desvios.
- 2026-11-25 · 01.3 · Renomeado o serviço para `BoardPlacementService`, generalizada a colocação por status e mantida correção em lote/publicação em Backlog. · `pnpm --dir packages/api exec vitest run src/application/services/projects/projectBoard.test.ts src/controllers/taskPublicationWorkerController.test.ts src/application/services/assigned-issues` → passou (6 arquivos, 46 testes); `pnpm --dir packages/api typecheck` → passou. · Sem desvios.
- 2026-11-25 · 01.4 · Gateway de Issues envia responsáveis opcionais e extrai/valida recibo, incluindo ids dos responsáveis. · `pnpm --dir packages/api exec vitest run src/infra/github/githubIssueGateway.test.ts` → passou (1 arquivo, 15 testes); `pnpm --dir packages/api typecheck` → passou. · Sem desvios.
