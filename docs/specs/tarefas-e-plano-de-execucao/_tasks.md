---
schema_version: "compozy.tasks/v2"
workflow: tarefas-e-plano-de-execucao
graph:
  nodes:
    - id: task_01
      file: task_01.md
    - id: task_02
      file: task_02.md
    - id: task_03
      file: task_03.md
    - id: task_04
      file: task_04.md
    - id: task_05
      file: task_05.md
    - id: task_06
      file: task_06.md
    - id: task_07
      file: task_07.md
    - id: task_08
      file: task_08.md
    - id: task_09
      file: task_09.md
  edges:
    - from: task_01
      to: task_03
    - from: task_02
      to: task_04
    - from: task_03
      to: task_04
    - from: task_03
      to: task_05
    - from: task_04
      to: task_05
    - from: task_02
      to: task_06
    - from: task_03
      to: task_06
    - from: task_02
      to: task_07
    - from: task_04
      to: task_08
    - from: task_05
      to: task_08
    - from: task_07
      to: task_08
    - from: task_06
      to: task_09
    - from: task_08
      to: task_09
---

# Tarefas: Tarefas e plano de execução

> **Spec:** [spec.md](spec.md) · **Data:** 2026-11-23 · **Total:** 9 tarefas, 27 mini-tarefas · **Plano aprovado pelo usuário em 2026-11-23**, com a opção (a): as tarefas são geradas agora, e a 05 espera a correção da review-001 da Spec C

## Objetivo
Com a spec capturada, a tarefa ganha a etapa "Tarefas". Nela a pessoa gera as tarefas pela spec-to-tasks, lê cada tarefa com o estado e as versões e monta um plano de sessões, cada uma com agente, modelo e esforço. Depois inicia sessão a sessão, e a próxima libera quando as dependências terminam.

## Estado
<!-- Keep this table in sync with each task file's frontmatter `status`. The implementer updates it when starting and finishing a task. -->
| Tarefa | Tipo | Complexidade | Depende de | Mini-tarefas | Status |
|---|---|---|---|---|---|
| [01 — Spike V-33 de modelo e esforço no SDK](task_01.md) | test | high | — | 0/2 | pending |
| [02 — Leitura do conjunto de tarefas](task_02.md) | backend | medium | — | 0/3 | pending |
| [03 — Migration 0049 e catálogo de agentes](task_03.md) | backend | high | 01 | 0/2 | pending |
| [04 — Plano de execução: regras e salvamento](task_04.md) | backend | high | 02, 03 | 0/4 | pending |
| [05 — Abertura com propósito e modelo no runtime](task_05.md) | backend | critical | 03, 04 | 0/5 | pending |
| [06 — Captura nas sessões do plano](task_06.md) | backend | medium | 02, 03 | 0/2 | pending |
| [07 — Tela: aba Tarefas e leitura](task_07.md) | frontend | medium | 02 | 0/2 | pending |
| [08 — Tela: gerar tarefas e plano de execução](task_08.md) | frontend | high | 04, 05, 07 | 0/4 | pending |
| [09 — Ponta a ponta, regressão e entrega](task_09.md) | test | medium | 06, 08 | 0/3 | pending |

**Ondas:**
1. 01 ‖ 02. O spike é manual e fica fora do código do produto. Os leitores puros e o `taskSet.get` só leem as tabelas de artefatos que já existem.
2. 03 ‖ 07. Migration e catálogo em `packages/api`, contra a aba de leitura em `apps/web`.
3. 04 ‖ 06. Os arquivos do plano (`services/tasks-set/plan*`, `ExecutionPlanDao`, controller, routers) contra a ingestão (`terminalEventIngestion.ts`, `drizzleTerminalEventDao.ts`).
4. 05. Só começa depois da correção da review-001 da Spec C (ver "Premissas e bloqueios").
5. 08.
6. 09.

## Como executar (controle)
Veja o progresso e a próxima mini-tarefa liberada a qualquer momento: `python3 -I .claude/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/tarefas-e-plano-de-execucao`.

1. **Escolha** a próxima tarefa liberada: `pending`, e todas as de que ela depende estão `completed`.
2. **Implemente** numa sessão nova: "implemente a mini-tarefa 02.1 de `docs/specs/tarefas-e-plano-de-execucao/task_02.md`" (ou a tarefa inteira). O implementador:
   - muda o `status` para `in_progress`;
   - marca `[x]` em cada mini-tarefa só depois de rodar o "Pronto quando" dela;
   - anota no "Registro de execução" os comandos e o resultado.
3. **Feche a tarefa:** ela passa a `completed` quando todas as mini-tarefas estão marcadas e os critérios de sucesso foram comprovados por comando. Repita a partir do passo 1 até todas as tarefas estarem `completed`.
4. **Revisão final, uma vez, depois de todas as tarefas:** "revise a feature contra a spec" com **spec-conformance**. Ela revisa tudo de uma vez: requisitos, regras do projeto, testes e o que os registros de execução afirmam. O veredito vai para `reviews/` e para a seção "Revisão final" abaixo.
5. **Se REPROVADO:** o prompt de correção do relatório vira uma rodada de correções; depois, nova revisão final. A feature está pronta quando a revisão final estiver APROVADO (ou APROVADO COM RESSALVAS aceito por você).

## Revisão final
<!-- spec-conformance appends one line per final review. -->

## Restrições globais
- `.agents/rules/code-standards.md`: sem comentários, arquivos `.ts` com até 100 linhas, funções com até 30 linhas, até 3 parâmetros (senão um objeto), sem linhas em branco dentro de funções, constantes no lugar de números e strings mágicas, até 3 `if`/`else` encadeados.
- Skills obrigatórias: `layered-backend` (controllers, services, DAOs), `trpc-nextjs` (procedures `tasks.taskSet.*`, `tasks.plan.*`, `tasks.terminal.*`), `nextjs-folder-structure` (arquivos da web), `software-testing` (todo teste). E2E segue `.agents/rules/e2e-testing.md`.
- Contratos em `packages/api/src/application/`, implementações em `packages/api/src/infra/`. O Agent SDK só é importado em `packages/api/src/infra/terminal/`.
- Toda a interface em português do Brasil, com os textos exatos da spec (seções 5, 6, 7 e 8).
- Migration escrita à mão (`0049_session_plans.sql` e `_rollback.sql`), registrada em `packages/api/drizzle/meta/_journal.json` e em `FEATURE_MIGRATIONS` de `packages/api/test/databaseMigrations.ts`.
- Não tocar nas tabelas legadas `task_execution_plans` e `task_execution_runs`, nem nos agentes de planejamento (`packages/api/src/infra/agents/`, `application/agents/agentCatalog.ts`).
- O Flow Dev não escreve no clone nem no GitHub; só a sessão do agente escreve (§9).
- Verificação proporcional (AGENTS.md):
  - durante a mini-tarefa, só o arquivo de teste afetado (`pnpm --dir <pacote> exec vitest run <arquivo>`, ou `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts <arquivo>` para `packages/api/test/`) e o `typecheck` do pacote;
  - suítes completas só no fim de cada tarefa;
  - e2e só na 09.
- `pnpm --dir packages/api test:integration` sem `TEST_DATABASE_URL` (Postgres descartável, cerca de 1 min). Não matar processos com `pkill -f` que case com o próprio comando.

## Premissas e bloqueios
- **Bloqueio da 05 (decisão do usuário em 2026-11-23, opção a):** a Spec C tem a `review-001` REPROVADA (B-1: a parada normal do serviço encerra as sessões; I-1 a I-5). A 05 altera `sessionStarter.ts`, `sessionResume.ts`, `sessionWorkerParts.ts` e o supervisor, os mesmos arquivos da correção. Ela só começa depois de aplicado o prompt de correção de `docs/specs/sessao-no-flow-dev/reviews/review-001.md`. As tarefas 01 a 04, 06 e 07 não dependem disso.
- **P-14 e a 7.4** dependem do spike 01. Se o V-33 recusar combinações, a 01.2 ajusta a 7.4 e a P-14 da spec, e a 03.2 segue o `v33-spike.md`.
- **Atalhos do plano na tela:** "Todas numa sessão", "Uma sessão por tarefa" e "Mesmo modelo para todas" são lógica do editor em `apps/web` (DEC-25: edição local, um salvamento). O servidor garante, pelo `planRules`, que as sessões iniciadas não mudam.
- **Estado "Encerrada" e "Iniciar de novo":** a 7.5 lista a última execução com tarefas não concluídas tanto em "Pronta/Bloqueada" quanto em "Encerrada". Seguimos a US-14.4: o estado é `ended`, com "Iniciar de novo"; o `open` reavalia as dependências externas, e se houver alguma aberta exige `force` como na REQ-102.
- **`stale` compara o grafo, não o número da versão (a confirmar com o usuário):** o prompt de execução (7.6) manda o agente atualizar a tabela do `_tasks.md`, e cada atualização gera uma versão nova do manifesto. Lida ao pé da letra, a REQ-097 mostraria "As tarefas mudaram…" depois de toda sessão. A reconciliação (04.2) compara `graph.nodes` e `graph.edges` da versão salva com os da atual; a versão gravada continua sendo a de referência.
- **Plano inexistente:** `plan.get` devolve `version: 0` e nenhuma sessão; o primeiro `save` com `version: 0` cria o plano com `version: 1`.
- **Manifesto com `graph.nodes` vazio:** motivo "o grafo de tarefas está ausente" (a 7.3 exige de 1 a 30 tarefas e não nomeia este caso).
- **E2E V-41:** depende da fixture `approvedWork` de `apps/web/e2e/fixtures/workSeed.ts` funcionar (o diff não commitado troca `::jsonb` por `::text::jsonb`) e de um arquivo de roteiro por clone (achado I-2 da review-001 da Spec C).

## Matriz de cobertura
| ID da spec | Descrição curta | Tarefa · mini-tarefa |
|---|---|---|
| P-14, DEC-24 (SDK), 7.4 (Claude) | modelo e esforço aceitos pelo SDK | 01 · 01.1, 01.2 |
| REQ-083 | etapa com "Nenhuma tarefa gerada ainda." e botão | 07 · 07.1; 08 · 08.1 |
| REQ-084, REQ-109 | "Gerar tarefas" com prompt e escolha | 05 · 05.3, 05.4; 08 · 08.1 |
| REQ-085, 7.1 | escolha da spec, a mais recente primeiro | 02 · 02.3; 05 · 05.3; 08 · 08.1 |
| REQ-086, B-32 | conjunto reconhecido de qualquer sessão; outro conjunto | 02 · 02.3; 07 · 07.1 |
| REQ-087 | lista na ordem do manifesto | 02 · 02.2; 07 · 07.1 |
| REQ-088 | conteúdo com versões e "Visão geral" | 07 · 07.2 |
| REQ-089 | versão mais recente, reflexo em 5 s | 02 · 02.3; 07 · 07.1 |
| REQ-090, 7.3 | manifesto inválido | 02 · 02.1; 07 · 07.1 |
| REQ-091 | arquivo não capturado | 02 · 02.2; 07 · 07.1 |
| 7.2, B-33, B-34 | status e mini-tarefas | 02 · 02.2 |
| REQ-092, REQ-095, REQ-096, 7.8 | regras do plano | 04 · 04.1, 04.4 |
| REQ-093, REQ-094 | atalhos e padrão Opus · Máximo | 03 · 03.2; 08 · 08.2 |
| REQ-097, REQ-099 | reconciliação e "Sem sessão" | 04 · 04.2; 08 · 08.3 |
| REQ-098, DEC-25 | conflito entre abas | 04 · 04.4; 08 · 08.3 |
| REQ-100, 7.5 | pronta, bloqueada, estados | 04 · 04.2; 08 · 08.4 |
| REQ-101 | iniciar com a escolha do plano, inclusive no resume | 05 · 05.1, 05.5; 08 · 08.1 |
| REQ-102 | "Iniciar mesmo assim" | 05 · 05.5; 08 · 08.4 |
| REQ-103, DEC-23 | captura nas sessões do plano | 06 · 06.1, 06.2; 07 · 07.2 |
| REQ-104 | estado da sessão e histórico com a escolha | 05 · 05.2; 08 · 08.4 |
| REQ-105 | "Iniciar de novo" só com as não concluídas | 04 · 04.2; 05 · 05.5; 08 · 08.4 |
| REQ-106 | etapa "Concluída" | 07 · 07.1 |
| REQ-107, 7.7, B-36 | só a operadora age | 04 · 04.4; 05 · 05.4; 08 · 08.3 |
| REQ-108 | exclusão da Issue | 04 · 04.3 |
| REQ-110, B-42 | agente indisponível | 03 · 03.2; 04 · 04.4; 05 · 05.4, 05.5; 08 · 08.1, 08.4 |
| 7.6, B-35 | prompts | 05 · 05.3 |
| NFR-15 | 1 s no p95 com 30 tarefas | 09 · 09.2 |
| NFR-16 | escolha validada no servidor; caminhos sem `..` | 03 · 03.2; 04 · 04.4; 05 · 05.3, 05.4 |
| NFR-17 | teclado, texto, `role="status"` | 07 · 07.1; 08 · 08.3, 08.4 |
| DEC-22 | conjunto lido dos artefatos | 02 · 02.3 |
| DEC-26 | `purpose` no `open` e no `preflight` | 05 · 05.3–05.5 |
| DEC-27 | `yaml` fixado | 02 · 02.1 |
| DEC-28 | registro de runtimes por agente | 05 · 05.1 |
| §14 | migration 0049 | 03 · 03.1 |
| §19 | logs `[plan]` e `[session]` com a escolha | 02 · 02.3; 04 · 04.4; 05 · 05.1, 05.5 |
| §20 | sob `FLOW_DEV_TERMINAL_ENABLED`; ordem de rollout | 07 · 07.1; ondas acima |
| §9 | o que não muda | 05 · 05.1, 05.2; 06 · 06.2; 09 · 09.2 |
| §24 | definição de pronto, `PRODUCT.md` | 09 · 09.2, 09.3 |
| B-37 | arquivo sumido do clone | 06 · 06.2 |
| B-38 | Execução direta sem conjunto | 07 · 07.1 |
| B-39 | "Falhou ao abrir" não conta como iniciada | 04 · 04.2; 05 · 05.1 |
| B-40 | `.md` fora da pasta | 06 · 06.1, 06.2 |
| B-41 | sessão ativa na tarefa | 05 · 05.4 |
| V-33a–e | spike | 01 |
| V-34a–l | parsers | 02 · 02.1, 02.2 |
| V-34m–q | `taskSet.get` | 02 · 02.3 |
| V-35a–n | regras puras do plano | 04 · 04.1, 04.2 |
| V-35o–r | editor do plano | 08 · 08.2 |
| V-36a–i | `plan.get`/`plan.save` + Postgres | 04 · 04.3, 04.4 |
| V-37a–n | sessão gravada, prompts, `open`/`preflight` com `purpose` | 05 · 05.2–05.5 |
| V-38a–f | runtime por agente, modelo e esforço | 05 · 05.1 |
| V-39a–f | captura | 06 |
| V-40a–t | componentes | 07, 08 |
| V-41 | jornada e2e | 09 · 09.1 |
| V-42a–b | smoke real | 09 · 09.3 |
| V-43a–c | migração preserva os dados | 03 · 03.1 |
| V-43d–f | regressão | 09 · 09.2 |
| V-44a–c | catálogo puro | 03 · 03.2 |
| V-44d | agente indisponível no `plan.save` | 04 · 04.4 |
| V-44e–f | agente indisponível ou escolha inválida no `open` | 05 · 05.4 |
| V-44g | item em agente indisponível (B-42) | 05 · 05.5 |

## Foco de revisão
1. Caminho em `graph.nodes` que não segue `task_NN.md` (ex.: `file: ../x.md`) → manifesto inválido com "o frontmatter está ausente ou inválido", e nada fora da pasta é lido → teste em 02.1 (V-34b)
2. Pasta `docs/specs/login-old/` ao lado de `docs/specs/login/` → a captura do plano não confunde os prefixos → teste em 06.1 (V-39f)
3. `save` que tenta remover uma sessão iniciada (ela some da lista enviada) → `plan_item_started`, nada muda → teste em 04.1 (V-35e)
4. Sessão `codex` gravada e runtime `codex` ausente no serviço (configuração mudou depois do `open`) → "Falhou ao abrir" com o motivo da REQ-110, sem quebrar o supervisor → teste em 05.1 (V-38e)
5. Caminho de artefato com `..` → fica fora do prompt → teste em 05.3 (V-37e)
