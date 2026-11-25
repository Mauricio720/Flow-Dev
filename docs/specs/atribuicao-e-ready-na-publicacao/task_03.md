---
status: completed
title: Publicação e worker com a opção
type: backend
complexity: high
---

# Task 03: Publicação e worker com a opção

## Visão geral
Liga as peças das tasks 01 e 02 ao fluxo de publicação. `tasks.publish` recebe `assignToSelf`, o aceite recusa com M-1, M-2 ou M-3 antes de criar, e o worker confere de novo, cria a Issue com o responsável, coloca em Ready ou Backlog e grava o resultado (F-1 e F-2 da spec). É a fatia P1 do backend, ponta a ponta contra o Postgres de teste e o GitHub simulado.

<critical>
- LEIA a spec (`spec.md`, principalmente §6, §8, §15, §16, §18 e §19) e as regras do projeto (AGENTS.md, `.claude/rules/code-standards.md`) antes de começar. Use as skills `layered-backend` e `trpc-nextjs`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-002: com a opção e as conferências passando, a Issue é criada com a conta de RN-02 como única responsável (`assignees: [login]`, login do `GET /user` da elegibilidade).
- REQ-003: quando `receipt.assigneeGithubIds` contém `publisherGithubId`, a Issue vai para Ready com os pontos de prioridade do draft.
- REQ-004 e NFR-01: o sistema atribui só a conta de RN-02; o input de `tasks.publish` aceita apenas `assignToSelf: boolean` e nenhum login ou id.
- REQ-005: com a opção, faltando quadro, Ready ou escrita, o aceite recusa com `PRECONDITION_FAILED` e o primeiro motivo de RN-05 (`ready_board_missing`, `ready_status_missing`, `assign_permission_denied`), sem criar a Issue.
- REQ-006: as conferências rodam no aceite e de novo no worker, imediatamente antes de `create`.
- REQ-007: se a conferência do worker recusar, a tentativa termina `rejected` com o motivo, a tarefa volta a `draft_ready` e nada é criado.
- REQ-008: com a opção, falha de leitura do quadro recusa sem criar, com `provider_unavailable` ou `provider_rate_limited` (PT-01).
- REQ-009: depois de uma recusa, o draft e a revisão ficam intactos e uma nova publicação sem a opção é aceita.
- REQ-010: com a opção e sem a conta no recibo, a Issue vai para Backlog e o resultado é `not_assigned`.
- REQ-011 e P-02: Ready falhando nas duas tentativas → a Issue continua publicada e atribuída e o resultado é `ready_failed`.
- REQ-015: nada é refeito nem desfeito depois de criar; o resultado só é gravado se ainda estiver nulo.
- NFR-02: o aceite faz uma só leitura do quadro (a que já faz hoje em `assertAuthorized`), com ou sem a opção.
- B-01: duplo clique com a mesma escolha → uma só tentativa; mesma chave com outra escolha → `request_key_reused`.
- B-02, B-03: Ready, quadro ou escrita que somem entre aceitar e criar → recusa no worker com M-2, M-1 ou M-3. Se a conferência passa e o GitHub descarta o responsável, vale REQ-010.
- B-04: publicação incerta → nada vai ao quadro e nenhum resultado é gravado.
- §19: log `[tasks-worker]` com o id da tarefa quando o resultado é `not_assigned` ou `ready_failed`, no padrão de `taskPublicationWorkerController.ts:53`, sem token, login, título nem corpo.
- Não muda (§9): sem a opção, o worker cria sem `assignees`, coloca em Backlog e deixa a falha no quadro só no log; a prévia faz as mesmas consultas; os fluxos de incerta, recusada pelo GitHub e "Verificar agora" seguem iguais.

## Interfaces
- **Consome:**
  - task_01: `readyRefusal`, `ReadyRefusal` (`application/services/tasks/readyAssignmentRules.ts`); `BoardPlacementService.statuses/assertAuthorized/place` (`application/services/projects/boardPlacementService.ts`); `BoardStatus`; `ApprovedIssueRequest.assignees`; `IssueReceipt.assigneeGithubIds`.
  - task_02: `PublicationApproval.assignToSelf`; `PublicationWorkerClaim.assignToSelf`; `TaskPublicationWorkerDao.recordReadyAssignment`; `ReadyAssignmentResult`.
  - Existente: `IssueEligibility.canWriteContents` e `publisherLogin`; `TaskError`; `taskErrorCode` em `controllers/taskErrorMapper.ts:31`.
- **Produz** (a task_04 consome):
  - `taskPublishInputSchema.extend({ assignToSelf: z.boolean().default(false) })` em `packages/api/src/schemas/tasks.ts` (o schema atual é estendido no mesmo lugar).
  - `TaskErrorReason` com `"ready_board_missing" | "ready_status_missing" | "assign_permission_denied"`, todos mapeados para `PRECONDITION_FAILED`.
  - `application/services/tasks/readyAssignmentService.ts`:
    ```ts
    type ReadyRecorder = Pick<TaskPublicationWorkerDao, "recordReadyAssignment">;
    export type ReadyCheck = { projectId: string; token: string; assignToSelf: boolean; canWriteContents: boolean };
    export type ReadySettlement = { claim: PublicationWorkerClaim; token: string; receipt: IssueReceipt; priorityPoints: number | null };
    export class ReadyAssignmentService {
      constructor(board: BoardPlacementService, results?: ReadyRecorder);
      assertPossible(check: ReadyCheck): Promise<void>;          // sem a opção: igual ao assertAuthorized de hoje; com ela: lança TaskError(ReadyRefusal | provider_*)
      settle(settlement: ReadySettlement): Promise<ReadyAssignmentResult | null>; // null sem a opção
    }
    ```
  - Os construtores de `TaskPublicationController` e `TaskPublicationWorkerController` trocam `backlog?: BacklogPlacementService` (já renomeado na 01.3) por `readyAssignment?: ReadyAssignmentService`, na mesma posição.

## Mini-tarefas

- [x] **03.1 — Serviço de atribuição e motivos novos**
  - **Arquivos:** `packages/api/src/application/services/tasks/readyAssignmentService.ts` (criar), `packages/api/src/application/services/tasks/readyAssignmentService.test.ts` (criar), `packages/api/src/application/services/tasks/taskErrors.ts` (três motivos), `packages/api/src/controllers/taskErrorMapper.ts` (os três em `PRECONDITION_FAILED`)
  - **Testes:** V-04a, V-04b, V-04c, V-04d, V-04e
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/tasks/readyAssignmentService.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** use `BoardPlacementService` real com um `GitHubProjectBoardGateway` e um `ProjectDao` em memória, e um gravador em memória; não substitua o serviço do quadro, porque as 2 tentativas são o contrato. `settle` com a opção: conta presente → `place(ready)`; sucesso → grava `ready`; erro nas 2 tentativas → grava `ready_failed` e loga; conta ausente → `place(backlog)` em melhor esforço e grava `not_assigned`. Sem a opção: `place(backlog)` em melhor esforço com o log atual, e nada gravado.
- [x] **03.2 — Aceite com a opção (`tasks.publish`)**
  - **Arquivos:** `packages/api/src/schemas/tasks.ts`, `packages/api/src/controllers/taskPublicationController.ts` (passar `assignToSelf` a `accepted` e `approve`; chamar `readyAssignment.assertPossible` no lugar de `backlog.assertAuthorized`, com `canWriteContents` da elegibilidade; tem 84 linhas: se passar de 100, extraia `assertEligibility` e `readiness` para `taskPublicationEligibility.ts`), `packages/api/src/infra/composition.ts` (montar `ReadyAssignmentService`), `packages/api/test/task-publication-case.ts` (opções `board?: { statuses: BoardStatus[] | "unreadable" | "rate_limited" }` com gateway de quadro simulado e o projeto com `board` gravado; contador `calls.boardReads`), `packages/api/test/ready-assignment-publish.test.ts` (criar)
  - **Testes:** V-05a, V-05b, V-05c, V-05d, V-05e, V-05f, V-05g
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/ready-assignment-publish.test.ts test/task-publication.test.ts test/task-publication-failures.test.ts` passa; `pnpm --dir packages/api exec vitest run src/controllers/taskPublicationController.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** `tasks.preview` não muda (DEC-02: o contrato da prévia é o mesmo e a prévia não lê o quadro de outro jeito). A tradução dos erros de leitura do quadro segue PT-01.
- [x] **03.3 — Worker com a opção**
  - **Arquivos:** `packages/api/src/controllers/taskPublicationWorkerController.ts` (91 linhas: mova a colocação no quadro e o log para `ReadyAssignmentService.settle`, e, se preciso, `authorizedContext` para `taskPublicationWorkerContext.ts`), `packages/api/src/infra/composition.ts`, `packages/api/test/task-publication-case.ts` (o recibo simulado aceita `assigneeGithubIds`; o `create` simulado guarda o último input em `calls.lastCreate`; o quadro simulado pode mudar entre aceite e worker e pode falhar a colocação N vezes), `packages/api/test/ready-assignment-worker.test.ts` (criar), `packages/api/src/controllers/taskPublicationWorkerController.test.ts` (ajustes de construtor)
  - **Testes:** V-06a, V-06b, V-06c, V-06d, V-06e, V-06f, V-06g, V-06h, V-11b
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/ready-assignment-worker.test.ts test/task-publication.test.ts test/task-publication-failures.test.ts test/task-api-history-publication.test.ts test/task-capture-publication-race.test.ts` passa; `pnpm --dir packages/api exec vitest run src/controllers/taskPublicationWorkerController.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** ordem do F-2: contexto autorizado (guarde `canWriteContents` e `publisherLogin` da elegibilidade) → snapshot → com a opção, `assertPossible`, e a recusa vira `settle(rejected, motivo)` antes do `fenceDispatch` → `create` com `assignees: [publisherLogin]` só com a opção → `settle(created)` → `readyAssignment.settle`. Sem `publisherLogin` na elegibilidade e com a opção, recuse com `provider_unavailable` antes de criar e registre a escolha no Registro de execução.

## Detalhes de implementação
O harness `test/task-publication-case.ts` hoje passa `undefined` no lugar do serviço do quadro; estenda-o para montar `ReadyAssignmentService` com um `GitHubProjectBoardGateway` simulado e grave `board` no projeto da fixture (`state.project()` e o DAO de projetos). Mantenha o padrão atual: DAOs reais no Postgres, GitHub simulado, ids fixos. Os testes novos ficam em arquivos próprios para não passar de 100 linhas cada; reparta por cenário se precisar.

### Arquivos relevantes
- `packages/api/src/controllers/taskPublicationController.ts:50`: precedente `image_permission_denied` (recusa por falta de escrita) e `:52` chamada atual `assertAuthorized`.
- `packages/api/src/controllers/taskPublicationWorkerController.ts:34-35,50-53`: `create`, `settle`, `placeInBacklog` e o log atual.
- `packages/api/src/infra/github/githubIssueGateway.ts:14-19`: `publisherLogin` e `canWriteContents` (`permissions.push`).
- `packages/api/src/infra/github/githubGraphql.ts`: classes de erro do quadro (`RepositoryRateLimitedError`, `RepositoryAuthorizationNeededError`, `ProjectBoardNotFoundError`, `RepositoryForbiddenError`, `RepositoryUnavailableError`).
- `packages/api/src/infra/composition.ts:70,77,80`: montagem do worker, do controlador e do serviço do quadro.

### Arquivos afetados
- Ver "Arquivos" de cada mini-tarefa.

### Decisões relacionadas
- DEC-01: responsável no pedido de criação, confirmado pela resposta.
- DEC-02: conferir no aceite e antes de criar, recusando com erro.
- DEC-04: resultado gravado uma vez, nada refeito.

## Premissas
- PT-01 (ver `_tasks.md`, confirmada em 2026-11-25): tradução dos erros de leitura do quadro; quadro fechado ou inacessível vira `provider_unavailable`.
- O login atribuído é `IssueEligibility.publisherLogin` do worker, a mesma conta de "Criada por" na prévia (RN-02).

## Testes atribuídos
- [ ] V-04a: com a opção e `assigneeGithubIds` contendo `publisherGithubId` → `place` chamado com `status: "ready"` e os pontos do draft; grava `ready`; devolve `"ready"` · serviço real, gateway e gravador em memória
- [ ] V-04b: com a opção e `assigneeGithubIds: []` → `place` com `status: "backlog"`; grava `not_assigned` · serviço real, gateway e gravador em memória
- [ ] V-04c: com a opção, conta presente e `place(ready)` falhando sempre → exatamente 2 chamadas de `place`; grava `ready_failed`; `settle` não lança · serviço real, gateway e gravador em memória
- [ ] V-04d: sem a opção → `place` com `status: "backlog"`; nada gravado; devolve `null`; falha do quadro não lança (só log) · serviço real, gateway e gravador em memória
- [ ] V-04e: com a opção, `place(ready)` falha uma vez e passa na segunda → grava `ready` (P-02) · serviço real, gateway e gravador em memória
- [ ] V-05a: com a opção, para cada caso — projeto sem quadro, quadro só com Backlog e In Progress, `canWriteContents: false` — `tasks.publish` → `TRPCError` `PRECONDITION_FAILED` com `ready_board_missing`, `ready_status_missing` e `assign_permission_denied`; a tarefa segue `draft_ready`, com a mesma `version` e `currentRevisionId`; nenhuma tentativa gravada; `calls.create === 0` · controlador + DAOs no Postgres, GitHub simulado
- [ ] V-05b: com a opção e a leitura do quadro falhando por indisponibilidade e por limite → `provider_unavailable` e `provider_rate_limited`; nada aceito · controlador + Postgres, GitHub simulado
- [ ] V-05c: aceite com a opção e aceite sem ela → `calls.boardReads === 1` em cada um; `tasks.preview` → mesma quantidade de leituras de hoje · controlador + Postgres, GitHub simulado
- [ ] V-05d: aceite com a opção num quadro com Ready e escrita → status `publishing` e a tentativa com `assign_to_self = true`; sem a opção → `false` · controlador + Postgres, GitHub simulado
- [ ] V-05e: dois `publish` com a mesma `requestKey`, o primeiro sem a opção e o segundo com ela → o segundo falha com `request_key_reused` (`CONFLICT`) · controlador + Postgres
- [ ] V-05f: dois `publish` com a mesma chave e a mesma escolha (`true`) → mesmo `attemptId`, uma só tentativa e uma só operação (B-01) · controlador + Postgres
- [ ] V-05g: depois da recusa do V-05a (sem Ready), `publish` com nova chave e sem a opção → aceito, `publishing`; sem a opção e com o quadro ilegível → aceito, como hoje (US-02 cenário 4, REQ-009) · controlador + Postgres
- [ ] V-06a: aceite com a opção e o quadro perde Ready (e, em outro caso, a escrita) antes do `tick` → tentativa `rejected` com `ready_status_missing` (ou `assign_permission_denied`), tarefa `draft_ready`, `calls.create === 0` (B-02, B-03, REQ-007) · worker + Postgres, GitHub simulado
- [ ] V-06b: com a opção → `calls.lastCreate.assignees` é `[publisherLogin]` vindo da elegibilidade do worker; um `tasks.publish` que envia também `login: "outra"` e `assignees: ["outra"]` (chaves que o schema Zod descarta) continua criando com `[publisherLogin]` e nunca com "outra" (NFR-01, REQ-004) · worker + Postgres; tRPC caller
- [ ] V-06c: com a opção e o recibo com `assigneeGithubIds: ["88"]` → `place` com `status: "ready"` e os pontos do draft; `ready_assignment = 'ready'`; `tasks.byId` mostra `readyAssignment.state === "ready"` (US-01 cenário 1) · worker + Postgres, GitHub simulado
- [ ] V-06d: com a opção e o recibo com `assigneeGithubIds: []` → `place` com `status: "backlog"`; `ready_assignment = 'not_assigned'`; um log `[tasks-worker]` com o id da tarefa e sem login (US-03 cenário 1) · worker + Postgres, GitHub simulado
- [ ] V-06e: sem a opção → `calls.lastCreate` sem a chave `assignees`; `place` com `status: "backlog"`; `ready_assignment` nulo; `readyAssignment: null` (US-01 cenário 3, §9) · worker + Postgres, GitHub simulado
- [ ] V-06f: com a opção e `create` devolvendo `uncertain` → nenhuma chamada de `place`; `ready_assignment` nulo (B-04) · worker + Postgres, GitHub simulado
- [ ] V-06g: resultado já gravado como `ready` e o worker chama `settle` de novo com Ready falhando → o valor continua `ready` (REQ-015) · worker + Postgres
- [ ] V-06h: com a opção, conta presente e `place(ready)` falhando nas 2 tentativas → tentativa `created`, tarefa publicada, `ready_assignment = 'ready_failed'`, log `[tasks-worker]` (US-03 cenário 2, REQ-011) · worker + Postgres, GitHub simulado
- [ ] V-11b: `task-publication.test.ts`, `task-publication-failures.test.ts`, `task-api-history-publication.test.ts`, `task-capture-publication-race.test.ts` e `taskPublicationWorkerController.test.ts` passam, mudando só construtores e nomes · testes existentes

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Sem a opção, o corpo enviado e a colocação em Backlog são os de hoje (V-06e, V-11b).
- Typecheck de `packages/api` sem erros; nenhum arquivo acima de 100 linhas; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data · mini-tarefa · o que foi feito · comandos e resultado · desvios. -->
- 2026-11-25 · 03.1 · Criado o serviço de assentamento Ready/Backlog com tentativas do serviço real do quadro, gravação do resultado e motivos mapeados a `PRECONDITION_FAILED`. · `pnpm --dir packages/api exec vitest run src/application/services/tasks/readyAssignmentService.test.ts` → passou (5 testes); `pnpm --dir packages/api typecheck` → passou. · Sem desvios.
- 2026-11-25 · 03.2 · `tasks.publish` recebe `assignToSelf` com padrão falso, faz uma leitura do quadro no aceite e recusa pelos motivos especificados; o harness agora simula quadros e leituras. A prévia mantém a leitura de autorização existente. Extraí a elegibilidade para `taskPublicationEligibility.ts`, conforme a nota da mini-tarefa e o limite de 100 linhas. · `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/ready-assignment-publish.test.ts test/task-publication.test.ts test/task-publication-failures.test.ts` → passou (3 arquivos, 24 testes); `pnpm --dir packages/api exec vitest run src/controllers/taskPublicationController.test.ts` → passou (6 testes); `pnpm --dir packages/api typecheck` → passou. · Sem desvios.
- 2026-11-25 · 03.3 · Worker refaz as conferências, usa o login do servidor na criação, envia a Issue para Ready ou Backlog conforme o recibo e grava o resultado uma vez. Sem login elegível, recusa antes de criar com `provider_unavailable`. · `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/ready-assignment-worker.test.ts test/task-publication.test.ts test/task-publication-failures.test.ts test/task-api-history-publication.test.ts test/task-capture-publication-race.test.ts` → passou (5 arquivos, 29 testes); `pnpm --dir packages/api exec vitest run src/controllers/taskPublicationWorkerController.test.ts` → passou (7 testes); `pnpm --dir packages/api typecheck` → passou. · Sem desvios.
