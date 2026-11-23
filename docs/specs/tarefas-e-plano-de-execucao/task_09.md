---
status: pending
title: Ponta a ponta, regressão e entrega
type: test
complexity: medium
---

# Task 09: Ponta a ponta, regressão e entrega

## Visão geral
Esta tarefa liga tudo e fecha a definição de pronto da spec (§24). Ela cobre:
- uma jornada e2e com o runtime roteirizado: gerar → ler → planejar → executar → liberar a próxima;
- a regressão das Specs A–C;
- a medição da NFR-15;
- as suítes completas, o build e o `PRODUCT.md`;
- o smoke com o Claude real pela UI.

<critical>
- LEIA a spec (`docs/specs/tarefas-e-plano-de-execucao/spec.md`, §9, §10 NFR-15, §22–§24, V-41–V-43), `.agents/rules/e2e-testing.md`, a memória da Spec C sobre os e2e (fixture `approvedWork` e roteiro por clone; achado I-2 de `docs/specs/sessao-no-flow-dev/reviews/review-001.md`) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
- Um e2e marcado `test.fixme` ou `test.skip` NÃO conta como prova. Se a jornada não rodar, a 09.1 fica aberta e o motivo vai para o Registro de execução.
</critical>

## Requisitos
- V-41 / US-11 a US-14 ponta a ponta: as partes conectadas pela tela, pelo serviço com roteiro e pelo Postgres de teste.
- §9 / V-43, sem regressão:
  - a abertura pela rota segue sem modelo;
  - a lista geral de artefatos mostra também os arquivos das tarefas;
  - a captura sem skill fora do plano não acontece;
  - a segunda sessão pede confirmação;
  - `task_execution_plans` e `task_execution_runs` ficam intocadas;
  - o `session-conversation.spec.ts` afetado passa.
- NFR-15: com 30 tarefas, `taskSet.get` + `plan.get` em até 1 s no p95 local, e `plan.save` em até 1 s.
- §24:
  - `pnpm --dir packages/api test` e `test:integration`, `pnpm --dir apps/web test`, o e2e novo e o `session-conversation.spec.ts`;
  - `pnpm typecheck`, `pnpm lint` e `pnpm build`;
  - o smoke V-42 feito uma vez pela UI;
  - no `apps/web/PRODUCT.md`, "Tarefas" deixa de constar como removida.
- V-42: com o Claude real, a spec-to-tasks gera as tarefas, e uma sessão em Sonnet atualiza o status e libera a seguinte.

## Interfaces
- **Consome:**
  - do serviço: o runtime roteirizado com o passo `write_file` (task_05), selecionado por `FLOW_DEV_SESSION_FAKE_SCRIPT` com `NODE_ENV=test` (`scriptFromEnvironment` e `scriptFileFor` por clone);
  - as fixtures e2e (`apps/web/e2e/fixtures/index.ts`, `workSeed.ts`, `sessionScript.ts`, `gitRepository.ts`, `sessionWorkerSetup.ts`);
  - as telas das tasks 07 e 08;
  - as procedures `tasks.taskSet.get`, `tasks.plan.get` e `tasks.plan.save`.
- **Produz:** `apps/web/e2e/task-plan.spec.ts`; a medição da NFR-15 registrada; o registro do smoke V-42 em `docs/specs/tarefas-e-plano-de-execucao/v33-spike.md` (seção "Smoke V-42"); o `apps/web/PRODUCT.md` atualizado.

## Mini-tarefas

- [ ] **09.1 — Jornada e2e gerar → planejar → executar**
  - **Arquivos:** `apps/web/e2e/task-plan.spec.ts` (criar), `apps/web/e2e/fixtures/taskPlanScripts.ts` (criar: roteiros de geração e de execução com `write_file`), `apps/web/e2e/fixtures/index.ts` (fixture nova, se precisar)
  - **Testes:** V-41
  - **Pronto quando:** `pnpm --dir apps/web test:e2e e2e/task-plan.spec.ts` passa (sem `fixme`/`skip`) contra o banco descartável da memória `flow-dev-local-e2e-setup`
  - **Nota:** se a fixture `approvedWork` ainda violar `task_planning_decisions_content_check`, corrija a fixture (é dado de teste, não regra de produto) e registre. Cada teste usa o próprio clone e o próprio arquivo de roteiro (`scriptFileFor(dir, cwd)`), para não repetir o I-2 da Spec C.
- [ ] **09.2 — Regressão, NFR-15, suítes completas e `PRODUCT.md`**
  - **Arquivos:** `packages/api/test/session-plans-regression.test.ts` (criar: V-43e e a medição da NFR-15 com 30 tarefas), `apps/web/PRODUCT.md` (a etapa "Tarefas" sai da lista de removidas e ganha uma linha do que faz)
  - **Testes:** V-43d, V-43e, V-43f
  - **Pronto quando:** `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration`, `pnpm --dir apps/web test`, `pnpm --dir apps/web test:e2e e2e/session-conversation.spec.ts e2e/task-plan.spec.ts`, `pnpm typecheck`, `pnpm lint` e `pnpm build` passam, com a saída de cada um anotada no Registro de execução
- [ ] **09.3 — Smoke V-42 com o Claude real pela UI**
  - **Arquivos:** `docs/specs/tarefas-e-plano-de-execucao/v33-spike.md` (seção "Smoke V-42")
  - **Testes:** V-42a, V-42b
  - **Pronto quando:** a seção "Smoke V-42" registra, com data, a Issue usada, os passos feitos na tela, o que apareceu (tarefas, status, liberação da Sessão 2) e o modelo visto no log `[session]`; feito pelo usuário ou com ele acompanhando

## Detalhes de implementação
- Jornada V-41:
  1. uma Issue com o planejamento aprovado (Tech Spec) e `docs/specs/login/spec.md` semeado como artefato `spec-writer`;
  2. a operadora entra na aba "Tarefas" e aciona "Gerar tarefas";
  3. o roteiro de geração grava `_tasks.md` (01 → 02) e `task_01.md`/`task_02.md` com `write_file`, com a `spec-to-tasks` ativa, e termina a vez;
  4. a lista mostra as duas tarefas "Pendente";
  5. "Uma sessão por tarefa", a Sessão 2 em Sonnet · Alto, e "Salvar";
  6. a Sessão 2 aparece "Bloqueada: aguardando 01 (Pendente)";
  7. "Iniciar" na Sessão 1: o roteiro de execução, sem skill, reescreve `task_01.md` com `status: completed` e as caixas marcadas, e termina a vez;
  8. em até 5 s, a 01 mostra "Concluída", e a Sessão 2 passa a "Pronta".

  Asserções pelo que a pessoa vê (`getByRole`, `getByText`), sem classes CSS.
- V-43e confere pelo `information_schema` que as colunas de `task_execution_plans` e `task_execution_runs` são as mesmas de antes da 0049. Compare com a lista tirada aplicando as migrations até `0048_session_interaction` (`applyCurrentMigrations(client, "0049_session_plans")`).
- NFR-15: semeie 30 `task_NN.md` e um plano de 30 sessões. Meça 20 chamadas de `taskSet.get` + `plan.get` e 20 de `plan.save` pelo caller tRPC, e afirme o p95 ≤ 1000 ms. Registre os números no log. O teste é de limite folgado e local; se ficar instável na máquina, investigue a consulta antes de mexer no limite (AGENTS.md: não aumentar timeouts).

### Arquivos relevantes
- `apps/web/e2e/session-conversation.spec.ts`, `terminal-tracking.spec.ts` e `fixtures/sessionScript.ts`: e2e com o serviço roteirizado.
- `apps/web/playwright.config.ts` e `e2e/sessionWorkerSetup.ts`: como o serviço sobe no e2e.
- Memória `flow-dev-local-e2e-setup`: variáveis, banco descartável e a armadilha do limite do GitHub.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- §22 (estratégia de testes): uma jornada e2e só; o resto fica nas regras puras e na integração.

## Premissas
- A jornada usa o Claude Code no plano. O Codex real é provado na Spec E.

## Testes atribuídos
- [ ] V-41: spec semeada → "Gerar tarefas" → o roteiro grava `_tasks.md` e duas tarefas → "Uma sessão por tarefa", com a Sessão 2 em Sonnet · Alto → iniciar a 1 → o roteiro marca `completed` → a 01 "Concluída" e a Sessão 2 "Pronta" · Playwright + web + serviço com roteiro + Postgres de teste
- [ ] V-43d: suítes completas de `packages/api` (unidade e integração) e de `apps/web` passando depois de todas as tarefas, incluindo os testes da Spec C da abertura pela rota sem modelo (`terminal-open*`), da lista geral de artefatos (`task-artifacts-contract.test.ts`), da captura sem skill (`artifact-capture.test.ts` V-16b) e da segunda sessão (`terminal-open-guards.test.ts`) · suítes existentes
- [ ] V-43e: colunas de `task_execution_plans` e `task_execution_runs` iguais antes e depois da 0049; NFR-15 com 30 tarefas → p95 ≤ 1000 ms na leitura e no salvamento · Postgres de teste + caller tRPC
- [ ] V-43f: `pnpm --dir apps/web test:e2e e2e/session-conversation.spec.ts` passa com o diálogo alterado pelo `purpose` · Playwright
- [ ] V-42a: smoke pela UI com o Claude real: "Gerar tarefas" em Opus · Máximo, numa spec pequena → a spec-to-tasks grava os arquivos, e a aba mostra as tarefas · manual
- [ ] V-42b: smoke pela UI com o Claude real: Sessão 1 em Sonnet · Alto → o agente atualiza o `status` da tarefa, ela aparece "Concluída", e a Sessão 2 passa a "Pronta"; o log `[session]` mostra o Sonnet · manual

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando, sem `fixme` nem `skip` no `task-plan.spec.ts`.
- `pnpm typecheck`, `pnpm lint` e `pnpm build` sem erros.
- `apps/web/PRODUCT.md` sem "Tarefas" entre as etapas removidas.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->
