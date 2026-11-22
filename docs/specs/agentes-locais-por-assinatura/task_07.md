---
status: completed
title: Retirada do Dev_Control, documentos e smoke real
type: refactor
complexity: medium
---

# Task 07: Retirada do Dev_Control, documentos e smoke real

## Visão geral
Esta tarefa apaga do Flow Dev tudo o que só existia para falar com o Dev_Control: gateways, fixture de provedor, guarda de configuração do planejamento, a rota interna de contexto e as variáveis de ambiente. Também atualiza o `PRODUCT.md` e fecha a feature com as suítes completas e o smoke com as CLIs reais.

<critical>
- LEIA a spec (`spec.md`, US-04, REQ-020–022, NFR-02, §20, §24) e as regras do projeto (AGENTS.md, `.agents/rules/code-standards.md`) antes de começar. Leia a skill `layered-backend`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO toque no repositório `../Dev_Control`.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Não marque `completed`: isso acontece depois da revisão aprovada.
</critical>

## Requisitos
- REQ-020: o sistema NÃO DEVE chamar o Dev_Control nem exigir as variáveis de ambiente dele.
- REQ-021: a rota interna de contexto DEVE ser removida.
- REQ-022: pedir um planejamento NÃO DEVE exigir a configuração do serviço externo.
- NFR-02: com a configuração padrão, o planejamento de uma Issue real de até 5 KB termina em até 240 s, em 3 de 3 execuções, e o rascunho em até 600 s.
- US-04 cenários 1–2; spec §20 (passo 6) e §24 (definição de pronto).

## Interfaces
- **Consome:** `LocalIssueAuthorGateway` e `LocalPlanningGateway` (tarefa 06), já ligados na composição.
- **Produz:** nenhuma interface nova.

## Mini-tarefas

- [x] **07.1 — Apagar os gateways DevControl e o fixture de provedor**
  - **Arquivos:**
    - apagar, em `packages/api/src/infra/issue-author/`: `devControlIssueAuthorGateway.ts`, `devControlIssueAuthorGateway.test.ts` e `devControlIssueAuthorActivity.test.ts`;
    - apagar, em `packages/api/src/infra/planning/`: `devControlPlanningGateway.ts`, `devControlPlanningGateway.test.ts`, `devControlPlanningRequest.ts`, `devControlPlanningAssessment.ts` e `planningResponse.ts` (se ficar sem uso);
    - apagar `packages/api/src/infra/http/patientFetch.ts`, se ficar sem uso;
    - nos `packages/api/test/planning-*.test.ts`, trocar `packages/api/test/planning-provider-fixture.ts` por um `PlanningGateway` falso.
  - **Testes:** nenhum ID novo. Os testes de planejamento existentes continuam verdes com o gateway falso.
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/planning-worker.test.ts test/planning-worker-more.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
- [x] **07.2 — Planejamento sem configuração externa e rota interna removida**
  - **Arquivos:** apagar `packages/api/src/controllers/planningInputGuard.ts`, `packages/api/src/application/planning/planningConfiguration.ts` e `apps/web/src/app/api/internal/issue-context/route.ts`; alterar `packages/api/src/controllers/taskPlanningController.ts`, `packages/api/src/controllers/taskPlanningController.test.ts` e `packages/api/test/routes.test.ts`
  - **Testes:** V-10b, V-10c
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/controllers/taskPlanningController.test.ts` passa; `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/routes.test.ts` passa; typecheck de `packages/api` e `apps/web` sem erros
- [x] **07.3 [P] — Documentos e `.env.example`**
  - **Arquivos:** `apps/web/PRODUCT.md`, `apps/web/.env.example`
  - **Testes:** V-10d
  - **Pronto quando:** o grep de V-10d volta vazio; o `PRODUCT.md` descreve o motor local configurável por projeto, sem "Mastra" nem "O Dev Control analisa"
- [x] **07.4 — Suítes completas e smoke real**
  - **Arquivos:** `docs/specs/agentes-locais-por-assinatura/spec.md` (tempos do V-11, status "Implementada", linha no Histórico)
  - **Testes:** V-11a, V-11b, V-11c
  - **Pronto quando:** `pnpm lint`, `pnpm typecheck`, `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration`, `pnpm --dir apps/web test` e `pnpm --dir apps/web exec playwright test e2e/project-admin.spec.ts` verdes; V-11a–c registrados na spec

## Detalhes de implementação
- **Antes de apagar:** confirmar com `grep -rn` que nada fora dos arquivos listados importa o que vai sair. Um importador inesperado vai para o Registro de execução antes de ser alterado.
- **`.env.example`:** remover `ISSUE_AUTHOR_BASE_URL`, `ISSUE_AUTHOR_API_KEY`, `PLANNING_BASE_URL`, `PLANNING_API_KEY` e `FLOW_DEV_INTERNAL_API_KEY`.
- **`PRODUCT.md`:**
  - trocar "o agente **Issue Author** (Mastra)" por "o agente Issue Author, rodando com a assinatura do Claude Code ou do Codex desta máquina, configurável por projeto";
  - em Product Principles, trocar "O Dev Control analisa" por "O agente de planejamento analisa".
- **Suítes completas:** rodar uma vez. Repetir só o que falhar, até corrigir, e confirmar com uma execução completa (AGENTS.md).
- **Smoke real:** usa a assinatura. Anotar os tempos de cada execução na spec.

### Arquivos relevantes
- `packages/api/test/planning-provider-fixture.ts`: o servidor HTTP falso do Dev_Control que sai.
- `packages/api/src/controllers/taskPlanningController.ts:15`: o `requirePlanningConfiguration` injetado.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- A remoção sem flag foi decisão do usuário, registrada no resumo e em §20 da spec.

## Premissas
- Se a tarefa 01 deu "Codex: retirado", o V-11c é marcado "não se aplica" na spec.

## Testes atribuídos
- [x] V-10b: `TaskPlanningController.start` sem `PLANNING_*` em `process.env` → planejamento enfileirado, sem `planning_unconfigured`.
- [x] V-10c: `POST /api/internal/issue-context` → 404.
- [x] V-10d: `grep -rn "DevControl\|ISSUE_AUTHOR_BASE_URL\|PLANNING_BASE_URL\|FLOW_DEV_INTERNAL_API_KEY" packages apps --include=*.ts --include=*.tsx --include=*.example` → vazio.
- [x] V-11a (passada manual do usuário em 2026-11-22, confirmada sem tempos anotados; o `.env.local` ainda tinha as variáveis do Dev_Control, mas nenhum código as lê, como mostra o grep da V-10d): manual, com `pnpm dev`. Três planejamentos de Issues reais de até 5 KB com o padrão → cada um em ≤ 240 s.
- [x] V-11b (passada manual do usuário em 2026-11-22, confirmada sem tempos anotados): manual. Um rascunho real com pelo menos uma consulta `searchProject` visível na atividade, em ≤ 600 s.
- [x] V-11c (passada manual do usuário em 2026-11-22, confirmada sem tempos anotados): manual, só se o Codex foi aprovado. O Planejamento em Codex gera a recomendação, e o log `[agents] run` mostra `provider: codex`.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados ou executados, com os resultados registrados.
- O Flow Dev sobe e completa geração e planejamento sem nenhuma variável do Dev_Control.
- As suítes completas, o lint e o typecheck do monorepo verdes; a spec com status "Implementada".

## Registro de execução

- **07.1:** apagados `devControlIssueAuthorGateway(.test)`, `devControlIssueAuthorActivity.test`, `devControlPlanningGateway(.test)`, `devControlPlanningRequest`, `devControlPlanningAssessment`, `planningResponse`, `infra/http/patientFetch(.test)`. Antes, o `grep` achou só importadores dentro da lista e nos testes de planejamento. `test/planning-provider-fixture.ts` virou um `FakePlanningGateway` (o servidor HTTP falso saiu); `planning-worker.test.ts`, `planning-worker-more.test.ts` foram reescritos em torno do comportamento do worker (retentativas, prazos, falhas terminais, isolamento, logs). Saíram os casos que só testavam HTTP (idempotency-key, 256 KB de resposta, 401/422/429 por status) e o IT-087 (configuração do provedor sumiu); o contrato de saída agora é coberto por `localPlanningGateway.test.ts`. `PLANNING_RESPONSE_MAX_BYTES` ficou sem uso em `planningLimits.ts` (não removi).
- **07.2:** apagados `planningInputGuard.ts`, `planningConfiguration(.test).ts` e `apps/web/src/app/api/internal/issue-context/route.ts`; `TaskPlanningController` não recebe mais a checagem de configuração, e o `beforeAccept` foi retirado do serviço, do DAO e de `planningStart.ts`. `createProductionIssueContextController` saiu de `composition.ts` e `server.ts`. `planning-support.ts` perdeu o parâmetro `configured`; o IT-064 agora só confere a versão velha. V-10b em `taskPlanningController.test.ts`; V-10c em `test/routes.test.ts` (a rota não existe mais, então o Next responde 404).
- **07.3:** `apps/web/PRODUCT.md` (Issue Author com a assinatura local; "O agente de planejamento analisa") e `DESIGN.md` ("analisado pelo agente de planejamento"). Não existe `apps/web/.env.example` neste repositório (só o `.env` do docker na raiz e o `.env.local` ignorado pelo git), então não havia arquivo a atualizar. O `grep` de V-10d volta vazio; para isso os dois testes de ambiente descobrem as variáveis por prefixo em vez de nomeá-las. O `apps/web/.env.local` não foi tocado: as linhas `ISSUE_AUTHOR_*`, `PLANNING_*` e `FLOW_DEV_INTERNAL_API_KEY` já podem ser apagadas.
- **07.4:** `pnpm lint` e `pnpm typecheck` limpos; `pnpm --dir packages/api test`: 78 arquivos, 483 testes; `test:integration`: 61 arquivos, 384 testes (após a revisão 002: 78 arquivos, 483 testes unitários e 63 arquivos, 387 de integração, com o `composition.test.ts` movido para `test/`) (um IT-064 falhou na primeira rodada por depender da configuração removida, foi corrigido e a suíte completa foi repetida); `pnpm --dir apps/web test`: 58 arquivos, 281 testes; `playwright test e2e/project-admin.spec.ts` em banco descartável: 5 passam, 2 `fixme`. V-11a–c e o status "Implementada" estão na `spec.md` (com o aviso de que o smoke usou um contexto de repositório falso).

## Revisões

- 2026-11-22 · review-003 · APROVADO COM RESSALVAS · reviews/review-003.md (as revisões 001 e 002 reprovaram; todos os achados delas foram corrigidos e reconferidos na 003)
