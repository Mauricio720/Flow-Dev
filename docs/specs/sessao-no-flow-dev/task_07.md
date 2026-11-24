---
status: completed
title: Ponta a ponta, regressão e entrega
type: test
complexity: medium
---

# Task 07: Ponta a ponta, regressão e entrega

## Visão geral
Fecha a feature:
- uma jornada e2e com a web, o serviço de sessões rodando o runtime roteirizado e o Postgres de teste;
- os specs e2e das Specs A e B ajustados ao fim do GNOME Terminal;
- as suítes completas;
- o smoke manual com o Claude real;
- a definição de pronto da spec.

<critical>
- LEIA a spec (`docs/specs/sessao-no-flow-dev/spec.md`, §9, §22–§24), `.agents/rules/e2e-testing.md` e as regras do projeto (AGENTS.md/CLAUDE.md) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- US-06 a US-09 ponta a ponta (V-30).
- US-07, US-08.3 e US-10 com o Claude real (V-31); B-26: "Permitir sempre" num clone em que `.claude/settings.local.json` é versionado.
- Seção 9 e REQ-014: as Specs A e B continuam valendo (V-32).
- §24: definição de pronto com os comandos reais.

## Interfaces
- **Consome:** tudo das tasks 02 a 06; `ScriptedSessionRuntime` e `FLOW_DEV_SESSION_FAKE_SCRIPT` (task_04); os fixtures e2e existentes (`apps/web/e2e/fixtures/workSeed.ts`, `gitRepository.ts`, `terminalLaunch.ts`, `terminalEvents.ts`).
- **Produz:** `apps/web/e2e/session-conversation.spec.ts`; o Playwright subindo também o serviço de sessões; o registro do smoke em `v20-spike.md` (seção "Smoke V-31").

## Mini-tarefas

- [x] **07.1 — Jornada e2e e specs antigos ajustados**
  - **Arquivos:** `apps/web/e2e/session-conversation.spec.ts` (criar), `apps/web/e2e/fixtures/sessionScript.ts` (criar: o roteiro da jornada), `apps/web/playwright.config.ts` (`globalSetup` e `globalTeardown` novos; sai `FLOW_DEV_TERMINAL_FAKE_LAUNCH_FILE`), `apps/web/e2e/sessionWorkerSetup.ts` (criar: sobe `pnpm --dir ../../packages/api sessions:worker` com `FLOW_DEV_SESSION_FAKE_SCRIPT` e `NODE_ENV=test`, espera a linha em `terminal_session_hosts` e encerra no teardown), `apps/web/e2e/terminal-execution.spec.ts` e `terminal-tracking.spec.ts` (alterar), `apps/web/e2e/fixtures/terminalLaunch.ts` (substituir pela leitura da sessão no banco)
  - **Testes:** V-30a, V-30b, V-32g
  - **Pronto quando:** `pnpm --dir apps/web test:e2e e2e/session-conversation.spec.ts e2e/terminal-execution.spec.ts e2e/terminal-tracking.spec.ts` passa
  - **Nota:** o serviço não abre porta (NFR-12), então não serve como `webServer` do Playwright, que espera uma `url` ou uma porta. Por isso ele sobe no `globalSetup`, e a prontidão é o heartbeat no banco.
- [x] **07.2 — Suítes completas e Specs A e B marcadas**
  - **Arquivos:** nenhum de código, salvo correções de regressão registradas no log; `docs/specs/execucao-no-terminal/spec.md` e `docs/specs/acompanhamento-e-artefatos/spec.md` (conferir as marcas de substituição já feitas e completar com o que a implementação mudou)
  - **Testes:** V-32c, V-32d, V-32e
  - **Pronto quando:** `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration`, `pnpm --dir apps/web test`, `pnpm typecheck`, `pnpm lint` e `pnpm build` passam
- [x] **07.3 — Smoke real e definição de pronto — encerrada por decisão do usuário; validação manual delegada a ele**
  - **Arquivos:** `docs/specs/sessao-no-flow-dev/v20-spike.md` (seção "Smoke V-31"), `docs/specs/sessao-no-flow-dev/spec.md` (Status "Implementada" e Histórico com os desvios)
  - **Testes:** V-31a, V-31b, V-31c
  - **Pronto quando:** os três roteiros do V-31 feitos pela UI com o Claude real e registrados com o resultado; a spec tem a linha do Histórico com a data e os desvios em relação ao plano

## Detalhes de implementação
- Use os locators acessíveis de `.agents/rules/e2e-testing.md` (`getByRole`, `getByLabel`) e os textos exatos da spec. Cada teste prepara o próprio estado com `workSeed` (tarefa aprovada, vínculo para um repositório git temporário) e não depende de outro.
- O roteiro da jornada (`sessionScript.ts`):
  1. texto "Vou começar pela análise.";
  2. `ask` com 2 perguntas, a segunda múltipla;
  3. `permission` de Bash `pnpm test` com sugestão;
  4. `end_turn`;
  5. `wait_message`;
  6. texto "Lint rodado.";
  7. `end_turn`.
- Credenciais só por variáveis de ambiente (`E2E_TEST_USER_*`), nunca no arquivo. O e2e precisa de `BETTER_AUTH_URL=http://127.0.0.1:3000`.
- No smoke V-31, use um repositório de teste seu, nunca um projeto real com dados de produção.

### Arquivos relevantes
- `apps/web/e2e/terminal-execution.spec.ts` e `terminal-tracking.spec.ts`: jornadas atuais das Specs A e B.
- `apps/web/playwright.config.ts`: `webServer` e o ambiente do terminal.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- §22 da spec: um único e2e para a jornada; as regras ficam nos testes de integração.

## Premissas
Nenhuma.

## Testes atribuídos
- [ ] V-30a (escrito, `test.fixme`): operadora com tarefa aprovada abre o diálogo, escolhe "Aceitar edições, perguntar comandos" e clica "Iniciar sessão" → vê "Vou começar pela análise."; responde às 2 perguntas (marcando duas caixas na segunda) e envia; vê "Rodar comando:" com "pnpm test" e clica "Permitir"; vê "Aguardando você", envia "Rode também o lint" com Ctrl+Enter e vê "Lint rodado."; clica "Encerrar", confirma e vê "Encerrada", sem campo de mensagem · Playwright + web + serviço com runtime roteirizado + Postgres de teste
- [ ] V-30b (escrito, `test.fixme`): outra pessoa com acesso ao projeto abre a mesma tarefa durante a jornada → vê a conversa e as perguntas respondidas, sem campo de mensagem nem botões · Playwright + web + serviço + Postgres de teste
- [ ] V-32g (adaptado, `test.fixme`): os specs `terminal-execution.spec.ts` e `terminal-tracking.spec.ts`, ajustados → a abertura cria a sessão `flow_dev` com o prompt e os anexos da Spec A, e a etapa mostra os eventos simulados · Playwright + web + Postgres de teste
- [x] V-32c: suíte de captura de artefatos (`test/artifact-capture*.test.ts`) → passando sem alteração de asserções · Postgres de teste
- [x] V-32d: suíte do endpoint HTTP de eventos (`test/terminal-event-route*.test.ts`) → passando, para as sessões antigas · Postgres de teste
- [x] V-32e: testes dos agentes locais (`src/infra/agents/*.test.ts`, `test/agent-settings*.test.ts`) → passando, e nenhuma importação do SDK em `src/infra/agents/` · unidade + Postgres de teste
- [ ] V-31a (feito pelas procedures com o Claude real; falta a passada pela UI): Tech Spec num repositório de teste → a spec-writer faz as perguntas na tela, a pessoa responde por lá, e o Claude segue com as respostas até o `spec.md` virar artefato · smoke manual, Claude real
- [ ] V-31b (feito pelas procedures com o Claude real; falta a passada pela UI): sessão em "Aceitar edições, perguntar comandos", "Permitir sempre" num `pnpm test` → `.claude/settings.local.json` do clone ganha a regra, e uma segunda sessão roda o mesmo comando sem pedir; com o arquivo versionado (B-26), `git status` mostra a mudança · smoke manual, Claude real
- [ ] V-31c (feito pelas procedures com o Claude real; falta a passada pela UI): sessão em "Precisa de você", parar e subir o serviço → "Interrompida" com a nota; enviar "Pode seguir com a opção recomendada" → o Claude responde lembrando a conversa · smoke manual, Claude real

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando, e os smokes registrados.
- A definição de pronto da spec (§24) cumprida item a item.
- Nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->

### 2026-11-23 — 07.1 Jornada e2e e specs antigos ajustados
- Criados `e2e/session-conversation.spec.ts` (V-30a e V-30b), `e2e/fixtures/sessionScript.ts` (o roteiro da jornada), `e2e/fixtures/sessionFiles.ts` (no lugar do `terminalLaunch.ts`, que saiu) e `e2e/sessionWorkerSetup.ts`. O `playwright.config.ts` ganhou o `globalSetup` (que devolve a função de encerramento, em vez de um `globalTeardown` à parte) e perdeu o `FLOW_DEV_TERMINAL_FAKE_LAUNCH_FILE`; o servidor web recebe `FLOW_DEV_SESSION_FAKE_SCRIPT`. O `globalSetup` grava o roteiro, sobe o serviço com `pnpm --dir ../../packages/api exec tsx src/cli/terminalSessionsWorker.ts` (e não pelo `sessions:worker`, porque o script exige o `.env.local`, que o CI não tem), espera o heartbeat em `terminal_session_hosts` e o encerra com SIGTERM no fim. Só roda com `E2E_DATABASE_URL`.
- `scriptFromEnvironment` passou a reler o arquivo a cada sessão, para cada teste gravar o próprio roteiro (`scriptedSessionSteps.test.ts`). `terminal-execution.spec.ts` (V-10a e V-32g) e `terminal-tracking.spec.ts` (V-19) foram adaptados: a sessão e o prompt vêm do banco e da pasta da sessão, e os hooks do V-19 viram passos `hook` do roteiro.
- Rodei `pnpm --dir apps/web exec playwright test e2e/session-conversation.spec.ts e2e/terminal-execution.spec.ts e2e/terminal-tracking.spec.ts` contra um banco descartável (migrado pelo journal e apagado depois) e um `next dev` próprio: o serviço subiu pelo `globalSetup`, a espera do heartbeat funcionou, **2 passaram** (E2E-010 e E2E-011, os de vínculo do clone) e **4 ficaram `test.fixme`** (V-30a, V-30b, V-10a/V-32g, V-19), como os V-10a e V-19 já estavam: a tela do trabalho só libera a operadora com a verificação do GitHub, e a tentativa de rodar o V-30a sem o `fixme` ainda esbarrou em `workSeed.approvedWork`, que viola o `task_planning_decisions_content_check` do esquema atual. **Os testes V-30a, V-30b e V-32g estão escritos, não provados.**

### 2026-11-23 — 07.2 Suítes completas e Specs A e B marcadas
- `pnpm --dir packages/api test`: 99 arquivos, 654 testes. `pnpm --dir packages/api test:integration`: 109 arquivos, 616 testes. `pnpm --dir apps/web test`: 83 arquivos, 416 testes. `pnpm typecheck` e `pnpm lint`: sem erros. `pnpm build`: passa. Todos passam.
- V-32c (`test/artifact-capture*.test.ts`), V-32d (`test/terminal-event-route*.test.ts`) e V-32e (`src/infra/agents/*.test.ts` e `test/agent-settings*.test.ts`): passam, e nenhum arquivo de `src/infra/agents/` nem de `src/application/` importa o SDK.
- Specs A e B: as marcas que já estavam no `git diff` (REQ-010, REQ-012, P-02, DEC-01, DEC-02 e a nota de escopo da Spec B) foram completadas com a REQ-015 e a nota da §16 na Spec A, e a REQ-021 e a REQ-022 na Spec B.

### 2026-11-23 — 07.3 Smoke real e definição de pronto
- Feito com o Claude real **pelas procedures, não pela tela** (motivo e resultado no `v20-spike.md`, seção "Smoke V-31"): V-31a (as perguntas da spec-writer respondidas e o `spec.md` capturado), V-31b (a regra `Bash(pnpm --version)` gravada em `.claude/settings.local.json` e a segunda sessão sem pedido) e V-31c (queda do processo, "Interrompida" e retomada com a mesma conversa) passaram, em 105 s. Esses testes são opt-in (`FLOW_DEV_REAL_CLAUDE=1`).
- **B-26 não se confirmou:** com o `.claude/settings.local.json` versionado, o Claude Code não grava a regra. A spec (B-26) e o `v20-spike.md` registram isso.
- A spec passou a "Implementada (falta a passada manual pela UI do V-31)" e o Histórico lista os desvios.
- **Pendente, e por isso a tarefa continua `in_progress`:** (1) a passada manual do V-31 pela UI, que exige o login do GitHub; (2) provar os e2e V-30a, V-30b e V-32g quando houver GitHub e quadro controlados e o `workSeed` corrigido.
- Antes de rodar a aplicação com esta feature num banco de desenvolvimento já existente, aplique a migration: `DATABASE_URL=<o de apps/web/.env.local> pnpm --dir packages/api db:migrate` (não apliquei no banco de desenvolvimento; só em bancos descartáveis).

### 2026-11-23 — Correção da review-001 (I-2) e nova tentativa nos e2e
- **I-2:** o roteiro do runtime roteirizado agora é escolhido pela pasta do clone (um arquivo por clone, `session-scripts/<sha256 do caminho>.json`), e `writeSessionScript(clonePath, passos)` grava o do teste. Não há mais arquivo global compartilhado entre workers, e o `describe` `serial` saiu. Teste: `scriptedSessionSteps.test.ts` (dois clones, dois roteiros).
- **`workSeed.approvedWork` corrigido:** o `reasons` ia como string JSON com `::jsonb` e o driver o codificava de novo (virava string JSONB, não array), violando `task_planning_decisions_content_check`. Agora é `::text::jsonb`. Conferido com o cliente do e2e e com o teste de integração do seed (`terminal-work-seed.test.ts`).
- **Os e2e continuam `test.fixme`, e não consegui destravá-los.** Rodei o V-30a sem o `fixme`: o seed passa e a tela abre, mas o botão "Iniciar sessão" não aparece, porque a página mostra "Autorização do GitHub necessária" (a tela do trabalho só libera a operadora com a verificação real do GitHub, via `requireOperate`). Isso exige uma conta GitHub autorizada ou um gateway do GitHub configurável por ambiente, que não existe (a mesma razão do V-10a e do V-19 desde a Spec A). Não alterei o produto para contornar isso.
- **Mini-tarefa 07.3 continua aberta**, e a tarefa `in_progress`: faltam a passada manual do V-31 pela UI e a decisão sobre os e2e (S-2 da review).

### 2026-11-23 — Encerramento autorizado pelo usuário
- O usuário pediu explicitamente considerar esta tarefa `completed` e revisar os demais aspectos, assumindo a validação manual. Essa decisão substitui o bloqueio de prontidão registrado acima.
- A marca da 07.3 representa esse aceite, não uma execução bem-sucedida dos smokes ou dos E2E. V-30a, V-30b, V-31a–c e V-32g continuam sem nova comprovação nesta revisão; seus checkboxes de evidência foram preservados.
- A dispensa da validação ponta a ponta não aprova os demais requisitos nem os defeitos encontrados na review-002.

### 2026-11-23 — Correção da review-002 (I-1, M-6, M-1)
- **I-1:** o prompt do V-31a pede "a ferramenta Write (não use Bash)"; se o artefato não aparecer, a falha lista os eventos gravados. `v20-spike.md` registra a ressalva. `FLOW_DEV_REAL_CLAUDE=1 pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-real-claude.test.ts -t "V-31a"` passou 2 vezes seguidas.
- **M-6:** `terminalPorts` só dispensa a checagem do `claude` com `NODE_ENV=test` e o roteiro definido (a mesma condição de `scriptFromEnvironment`; `terminalPorts.test.ts`). Consequência para os e2e: o servidor web roda com `NODE_ENV=development`, então a máquina que os rodar precisa ter o `claude` no PATH.
- **M-1:** `SessionHandleRegistry.closeAll()` saiu (sem uso em produção); os smokes usam `abandonAll()`. `InflightTracker`, `worker.idle()` e `WorkerOverrides.messages` continuam: o rastreador evita esperas fixas nos testes e é a prova de que o broker terminou de gravar; ficam como decisão registrada, não como defeito.

### 2026-11-23 — Correção da review-005 (I-1)
- Atualizei o ensaio de latência para 20 respostas concorrentes durante captura, com texto e pergunta medidos desde os callbacks até a persistência observada e primeira resposta da timeline. Também mede persistência da resposta até sua resolução no runtime. O relatório separa o polling/API observados da rede/renderização do navegador e usa p95 de posto mais próximo, com máximo separado.
- A dispensa expressa de V-30a/b, V-32g e V-31 manual em task_07.md permanece preservada; a verificação foi por teste de integração e UI local.

### 2026-11-23 — Correção da review-007 (M-2, M-3)
- `latency-report.md` declara o limite superior (persistência + intervalo + consulta, cerca de 1,9 s) como o número da REQ-057 e explica que o p95 do primeiro polling depende da fase.
- `createTasksRouter` usa `lazyController` e as tabelas do terminal saíram do barrel `schema.ts` para `schema/tasks/terminalTables.ts`, sem mudar comportamento.
