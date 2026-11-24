# Revisão de conformidade 003: A sessão do Claude dentro do Flow Dev

> **Data:** 2026-11-23 · **Escopo:** feature inteira, tarefas 01–07 e 26 mini-tarefas · **Intervalo:** `1145d68..e88ea67`, mais a implementação atual dos artefatos já existentes nesse ponto de partida.
> **Spec:** `spec.md`, `_tasks.md`, `task_01.md` a `task_07.md`, `v20-spike.md` e revisões 001–002.
> **Regras lidas:** `AGENTS.md`, `CLAUDE.md`, `apps/web/AGENTS.md`, rules de código e E2E, `PRODUCT.md`, `DESIGN.md`, skills layered-backend, trpc-nextjs, nextjs-folder-structure e software-testing, incluindo seu guia de revisão.
> **Prontidão:** o verificador do manifesto confirma 7 tarefas completed e 26/26 mini-tarefas. A árvore estava limpa no início. A dispensa de E2E V-30a/b e V-32g e da passada manual V-31 pela UI, registrada na tarefa 07, foi preservada.

## Veredito: REPROVADO

As suítes, o typecheck, o lint e o build passam. Três cenários exigidos escapam da cobertura atual: início concorrente à preparação do prompt, encerramento de sessão sem handle após reinício e pergunta aberta depois do fim da vez. Os três foram reproduzidos nesta revisão. Há também uma lacuna de evidência de latência e pequenas violações de tamanho/assinatura.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 3 | 1 | 1 | 2 |

Esta revisão altera somente este relatório e uma linha no manifesto. Não altera código, checkboxes nem status das tarefas.

## Verificação executada

| Comando ou experimento | Resultado nesta sessão |
|---|---|
| `rtk python3 -I .agents/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/sessao-no-flow-dev` | exit 0 · 7 completed · 26/26 · validação OK |
| `rtk python3 -I .agents/skills/spec-conformance/scripts/scan_diff.py --repo . --base 1145d68 --head HEAD --max-lines 100` | exit 0 · 83 arquivos de teste alterados; dicas conferidas abaixo |
| `rtk pnpm --dir packages/api test` | exit 0 · 101 arquivos · 661 testes passam |
| `rtk pnpm --dir packages/api test:integration` | exit 0 · 110 arquivos passam, 2 ignorados · 618 testes passam, 5 ignorados · 154,67 s |
| `rtk pnpm --dir apps/web test` | exit 0 · 84 arquivos · 418 testes passam |
| `rtk proxy pnpm typecheck` | exit 0 · API e web; geração dos tipos das rotas concluída |
| `rtk pnpm lint` | exit 0 · eslint da web |
| `rtk pnpm build` | exit 0 · 17 páginas estáticas geradas; dois avisos de tracing em `packages/api/src/infra/agents/agentInstructions.ts:23`, arquivo sem alteração no intervalo |
| `rtk proxy pnpm --dir docs/specs/sessao-no-flow-dev/spike exec tsc --noEmit` | exit 0 |
| `rtk cmp` das duas rules contra suas cópias em `.claude/rules/` | exit 0 para ambas |
| Medição AST com TypeScript, em linha, dos 222 arquivos TS/TSX existentes alterados | funções/assinaturas descritas em M-1; agrupadores de testes e violações anteriores separados dos novos helpers |
| Reprodução em linha via `rtk pnpm exec tsx -e …`, no pacote API: controller + preparação + starter reais, colaboradores de persistência/runtime em memória, barreira explícita na preparação | exit 0 · B-1 reproduzido, sem sleep |
| Reprodução em linha via TSX: PostgreSQL descartável, DAOs reais, registry vazio e controles reais, dez ciclos | exit 0 · B-2 reproduzido |
| Reprodução em linha via TSX: mesmo PostgreSQL descartável, SessionRequestBroker + DAOs + máquina de estados reais | exit 0 · B-3 reproduzido |

A primeira tentativa com `rtk pnpm typecheck` foi interceptada pelo RTK como execução direta de `tsc` na raiz e terminou em “Command tsc not found”, sem executar o script do monorepo. A execução com `rtk proxy pnpm typecheck` chamou os scripts corretos e passou. Isso não foi classificado como falha do produto.

Os experimentos SQL usaram tabelas mínimas com as colunas acessadas pelos DAOs, sem os demais relacionamentos do produto; o PostgreSQL foi encerrado e removido ao final. A suíte de integração completa, separadamente, exerceu as migrations reais.

Não foram executados Playwright, Claude real nem novamente a espera de 30 minutos do spike. Os cinco testes de Claude real ficaram ignorados por serem opt-in. Evidência histórica de smoke foi lida, sem ser apresentada como nova execução. A dispensa de E2E/UI não cobre os defeitos de backend aqui reproduzidos.

O scanner encontrou quatro `test.fixme` já dispensados, uma chave fictícia `sk-teste`, a seleção de runtime de teste e duas asserções de nulidade acompanhadas por asserções de conteúdo. Não são achados novos. `schema.ts` tem 130 linhas, contra 129 na base, e é um barrel anterior à feature.

## Conformidade com a spec

| Item | Status | Evidência conferida |
|---|---|---|
| REQ-051, US-06.1 | 🔀 | O runtime, clone, prompt e plugin existem; a preparação e o consumo concorrem sem publicação de prontidão. B-1; `terminalSessionController.ts:69`, `sessionStarter.ts:23`. |
| REQ-052, REQ-053, US-06.4, US-08.1, §7.11 | ✅ | `TerminalLaunchMode.test.tsx`, `terminal-open-service.test.ts`, `agentSdkQueryOptions.test.ts`: padrão, três modos, heartbeat e bloqueio no servidor/UI. |
| REQ-054 | ✅ | `session-supervisor-start.test.ts` V-24g; `agentSdkMessages.ts:13` trata erros de autenticação anteriores ao primeiro texto. B-1 acrescenta uma falha indevida de abertura. |
| REQ-055, REQ-056, REQ-061, REQ-062, NFR-13 | ✅ | `sessionTimelineMerge.ts`, `session-recorder.test.ts`, `session-timeline*.test.ts`, `issue-deletion-terminal.test.ts`: ordenação, filtro do assistente principal, leitura, histórico e exclusão. |
| REQ-057, NFR-10 | 🟡 | Polling de 1,5 s e intervalo nominal de 1 s; sem medição da latência/p95. I-1. |
| REQ-058, REQ-059, REQ-060, US-06.2–3, B-25 | ✅ | `session-send.test.ts`, `session-delivery.test.ts`, `SessionComposer.test.tsx`: limites, conteúdo preservado e uma linha por requestKey; B-25 tem o registro histórico V-20j. |
| REQ-063, REQ-064, REQ-065, REQ-066, §7.9 | ✅ no fluxo principal | `questionAnswerValidation.test.ts`, `QuestionRequestCard.test.tsx`, `session-requests.test.ts`: opções, título, prévia, múltipla, Outra, resposta e bloqueio de incompletas. O estado do caso B-24 falha em B-3. |
| REQ-067, REQ-068, B-27 | ✅ | `session-answer.test.ts`, `session-interaction-dao.test.ts` e `sessionRequestBroker.test.ts`: resposta concorrente, pedido fechado e promessa aberta após 30 minutos de timers controlados. |
| REQ-069, REQ-070, REQ-072, §7.10 | ✅ | `permissionRequestSummarizer.test.ts`, `PermissionRequestCard.test.tsx`, `session-requests.test.ts`: resumos, decisões, motivo, regra visível e bypass. |
| REQ-071, B-26 | ✅ no contrato local; compatibilidade real não reexecutada | `answerMapper.test.ts`, V-24d e opções SDK; `session-real-permissions.test.ts:42` contém a prova opt-in. A exceção de arquivo versionado já está documentada em B-26. |
| REQ-073, US-09.1 | 🔀 | V-25a/b passam para os estados cobertos; pergunta tardia fica waiting e não pode ser interrompida por esse controle. B-3. |
| REQ-074, US-09.2 | 🔀 | V-25c passa com handle ativo; sessão interrupted sem handle não é selecionada. B-2. |
| REQ-075, REQ-080, B-22, §7.4 | ✅ | `sessionControlAuthorization.ts`, `session-send.test.ts`, `session-control.test.ts`, `SessionConversation.test.tsx`: identidade, operadora atual, leitura e finais. |
| REQ-076–079, US-10, B-23 | ✅ nos cenários atribuídos | `session-shutdown.test.ts`, `session-recovery.test.ts`, `session-resume.test.ts`: abandono, órfãs, cancelamento, retomada por mensagem e falha com Não entregue. Encerramento após recuperação: B-2. |
| REQ-081, REQ-082, B-28 | ✅ | `session-runtime-read.test.ts`, `ExecutionStageSessions.test.tsx`: não confirmada, ausência de sem sinal no runtime novo e histórico legado. |
| NFR-11, NFR-12, B-29, B-31 | ✅ nos testes atribuídos | `session-recorder.test.ts`, `session-supervisor-start.test.ts`, `agentSdkQueryOptions.test.ts`, `machineIdentity.ts`: erro de gravação, corte, host, opções fixas e sessões separadas. |
| NFR-14 | ✅ em componentes | RTL de pergunta, composer e controles; `SessionConversation.tsx:26` usa aria-live; teclado e confirmação verificados pela suíte web. |
| B-24 | 🔀 | O ramo de subagente está coberto; o ramo fim da vez → nova pergunta foi reproduzido com estado incorreto. B-3. |
| B-30 | ✅ | V-25b não altera a sessão quando não existe vez ativa. Isso precisa continuar verdadeiro após corrigir B-3. |
| §7.2 e V-21 | 🟡 | Testes de sinais passam, mas não incluem waiting + request_opened; o comportamento deixa o estado incorreto. B-3. |
| §7.5, §14 e DEC-21, V-22, V-32a | ✅ | Limites, 200 entradas, tabelas, checks, índices, migrations/rollback e dados antigos exercidos nas suítes. |
| §9 “não muda”, V-32b–f | ✅ nos testes de regressão | Prompt/anexos e captura/endpoint legado passam; nenhum diff em `packages/api/src/infra/agents/`; autorização/trava e segunda sessão continuam testadas. |
| DEC-15–20, P-09–P-12, V-20 | ✅ no desenho e registro histórico | SDK fixado 0.3.330, CLI do PATH, settings/fontes, hooks sintetizados e worker sem watch conferidos; spike compila. Compatibilidade real não foi reexecutada. |
| US-07, US-08, US-09 | 🟡 | Componentes e integração cobrem os fluxos principais; B-2/B-3 quebram combinações de estado previstas. |
| V-30a/b, V-32g; V-31 pela UI | ⚪ dispensados | `task_07.md` registra o aceite do usuário; os fixme não foram tratados como aprovados nem como novo bloqueio. |
| §24 e V-31 opt-in | 🟡 com dispensa preservada | Gates automatizados passam; smoke real não reexecutado; defeitos B-1–B-3 impedem aprovação de conformidade. |
| Fora de escopo | ✅ | Não foram introduzidos TTY, streaming palavra a palavra, notificações, troca de modo durante sessão nem runtime remoto. |

## Regras do projeto

| Regra e fonte | Situação | Evidência |
|---|---|---|
| Camadas e contratos, skills layered-backend/trpc-nextjs | Conforme no caminho principal | Procedures protegidas, identidade do contexto, autorização atrás do transporte, DAOs SQL em infra, SDK restrito a infra/terminal. Wrappers de erro seguem o padrão explicitamente indicado em `task_03.md:72`. |
| Posicionamento do frontend, nextjs-folder-structure | Conforme | Componentes/hooks/models em assigned-work; nenhuma rota nova; contrato inferido em `sessionContract.ts`. |
| Arquivos TS até 100 linhas, `code-standards.md:39` | Conforme nos novos arquivos | Scanner; o barrel schema.ts excedia o limite antes da feature. |
| Funções até 30 linhas e até 3 parâmetros, `code-standards.md:82,154` | Parcial | M-1. Há também extensão de funções anteriores já grandes, como createTasksRouter (31 → 34). |
| Comentários, números mágicos, segredos, `code-standards.md` | Sem novo achado relevante | Scanner e leitura; limites nomeados, sem chave real adicionada. |
| Testes com fronteiras pertinentes, software-testing | Parcial | SQL real e RTL presentes; faltam os interleavings B-1–B-3 e a evidência quantitativa I-1. |
| Independência dos E2E, `e2e-testing.md` §2 | Conferida no código; execução dispensada | Roteiro por clone, sem arquivo de roteiro global; regressão em scriptedSessionSteps.test.ts. |
| Verificação proporcional, `AGENTS.md` | Conforme | Uma execução de cada suíte completa; sem aumento de timeout ou redução de workers. |
| Rules espelhadas, `AGENTS.md` | Conforme | cmp das duas cópias passou. |
| Português, tokens e componentes, `apps/web/AGENTS.md` | Sem novo achado relevante | Textos e componentes conferidos; divergências documentais já conhecidas estão na seção seguinte. |

## Achados por tarefa

### B-1 (Bloqueante) · task_03 / 03.1 e task_04 / 04.3 — sessão publicada antes do prompt ficar pronto

- **Onde:** `packages/api/src/controllers/terminalSessionController.ts:69` cria e confirma a sessão; só depois, na linha 71, prepara a pasta. `packages/api/src/application/services/terminal/terminalOpenSteps.ts:25` escreve o prompt após copiar skills e entregar anexos. `packages/api/src/application/services/terminal/sessionStarter.ts:23` lê o prompt e, se ausente, marca falha imediatamente.
- **Contra:** REQ-051 (`spec.md:116`), fluxo inicial §16 e preservação de prompt/anexos em §9.
- **Evidência executada:** suspendi context.prepare numa barreira, chamei o starter real enquanto open estava pendente e liberei a preparação. Saída: `{"response":{"sessionId":"s","unavailableIssueImages":0},"status":"launch_failed","launchError":"O prompt da sessão não foi encontrado.","promptPrepared":true,"runtimeStarts":0}`. O controle da interleaving usou persistência em memória; a visibilidade antecipada do DAO real foi conferida em `drizzleTerminalSessionDao.ts:34`, cuja transação termina antes de prepareStep.
- **Escapa nos testes:** `session-supervisor-start.test.ts` aguarda world.open() terminar antes de executar tick(); não existe consumidor concorrente à preparação.
- **Consequência:** uma abertura válida pode terminar em Falhou ao abrir somente pela fase do polling ou pela duração das cópias/downloads.
- **Correção mínima:** publicar a sessão como consumível somente depois de o contexto e o prompt completos estarem prontos, com coordenação persistente entre web e worker. Preservar idempotência e a distinção entre preparação pendente e prompt realmente perdido; não remediar com sleep.
- **Verificação:** barreira determinística durante preparação, worker ativo nesse intervalo, depois liberação; nenhum launch_failed, prompt/anexos corretos e runtime iniciado uma única vez. Confirmar com Postgres real.

### B-2 (Bloqueante) · task_05 / 05.2–05.3 — Encerrar não funciona após reinício sem retomada

- **Onde:** `packages/api/src/application/services/terminal/sessionControls.ts:29` consulta controles somente para registry.ids(); `packages/api/src/infra/database/dao/terminal/drizzleSessionStatusDao.ts:31` devolve [] para essa lista vazia. O restart deixa a sessão interrupted sem handle, e o controller aceita end em qualquer estado ativo.
- **Contra:** REQ-074 (`spec.md:150`) e §7.2 (`spec.md:177`: qualquer estado não final → Encerrada).
- **Evidência executada:** PostgreSQL descartável, DAO requestEnd real aceitou o pedido; após dez execuções reais de SessionControlsStep com registry vazio: `{"status":"interrupted","end_pending":true,"handles":0}`.
- **Escapa nos testes:** V-25c encerra uma sessão com handle; V-26 cobre retomada ou ausência de mensagem, sem tentar end nessa ausência.
- **Consequência:** o botão aceita a confirmação e não encerra a sessão. É necessário retomar uma conversa que a pessoa pretendia encerrar.
- **Correção mínima:** selecionar também controles persistidos das sessões flow_dev da própria máquina sem handle; finalizar e capturar os artefatos sem reiniciar o Claude. Preservar o isolamento por host e impedir uma mensagem na fila de disparar retomada antes do encerramento solicitado.
- **Verificação:** iniciar → reiniciar → interrupted → end sem mensagem; ended, controles limpos, histórico somente leitura, captura executada e nenhuma chamada a runtime.resume. Incluir processo morto e outra máquina no teste.

### B-3 (Bloqueante) · task_02 / 02.3 e task_05 / 05.1 — pergunta após fim da vez não entra em Precisa de você

- **Onde:** `packages/api/src/application/services/terminal/sessionSignals.ts:14` só define request_opened para running; `sessionRequestBroker.ts:37` aplica esse sinal independentemente do estado. A UI só oferece Interromper em running/asking (`apps/web/src/features/issues/assigned-work/components/SessionControls.tsx:25`), e o worker também ignora a interrupção em waiting (`sessionControls.ts:37`).
- **Contra:** B-24 (`spec.md:229`), US-07.1 e REQ-073/REQ-068.
- **Evidência executada:** sessão waiting no PostgreSQL; broker e DAOs reais receberam AskUserQuestion e gravaram o pedido. Saída: `{"status":"waiting","request_status":"pending"}`. A promessa foi negada apenas para encerrar o experimento.
- **Escapa nos testes:** o teste nomeado B-24 em `session-recorder.test.ts:40` cobre uma pergunta com a sessão recém-iniciada, sem end_turn anterior. A matriz V-21 também não exerce waiting + request_opened.
- **Consequência:** a sessão exibe Aguardando você com pergunta pendente, e a pessoa não consegue cancelar essa pergunta por Interromper.
- **Correção mínima:** uma pergunta válida posterior ao fim da vez deve levar a asking e oferecer os mesmos controles da pergunta normal. Manter estados finais imutáveis e a regra B-30 quando realmente não houver trabalho/pedido.
- **Verificação:** roteiro end_turn → ask, incluindo pergunta de subagente; estado asking, pedido visível e interrupt cancela o pedido, resolve a promessa e retorna a waiting.

### I-1 (Importante) · task_05 / 05.2 e task_07 / 07.2 — latência exigida não foi comprovada

- **Onde:** `packages/api/src/application/services/terminal/sessionWorkerLoop.ts:7` espera o tick inteiro e só então dorme 1 s; `sessionWorkerComposition.ts:28` reúne passos sequenciais. `task_05.md:29` trata o próximo ciclo como “≤ 1 s”.
- **Contra:** NFR-10 (`spec.md:250`), REQ-057 e critério de evidência de software-testing.
- **Evidência:** os testes exercitam tick diretamente, e os testes de polling da web usam a resposta da API simulada; nenhum mede entrada persistida → runtime, nem texto/pedido → tela. Um intervalo de 1 s após trabalho de duração variável não prova um ciclo de até 1 s.
- **Consequência:** processamento/captura de uma sessão pode atrasar a entrega nas demais; a aprovação anterior não demonstra p95 ≤ 2 s nem atualização ≤ 3 s. Não foi observado nem afirmado um estouro real nesta revisão.
- **Correção mínima:** registrar um ensaio local controlado e reproduzível com PostgreSQL e runtime roteirizado, incluindo concorrência e captura em outra sessão, medir as latências exigidas e corrigir o escalonamento se a meta falhar. Não reabrir os E2E dispensados e não aumentar timeout para obter aprovação.
- **Verificação:** relatório do ensaio com amostra, carga, p95 e máximos/limitações; testes determinísticos para qualquer correção de escalonamento resultante.

### M-1 (Menor) · task_06 / 06.5 e task_07 / 07.3 — limites de função/assinatura ainda têm exceções novas

- **Onde:** `apps/web/src/features/issues/assigned-work/components/SessionComposer.tsx:11` ocupa 32 linhas até o fechamento; `packages/api/test/session-real-permissions.test.ts:21`, `packages/api/test/session-request-support.ts:11` e `packages/api/test/session-send.test.ts:14` declaram quatro parâmetros.
- **Contra:** `.agents/rules/code-standards.md:82` e `:154`; restrições globais do manifesto.
- **Evidência:** AST TypeScript dos arquivos atuais. Não contei o agrupamento externo describe como responsabilidade de produto, nem transformei violações anteriores em novos bloqueios.
- **Consequência:** a afirmação da review-002 de inexistência de funções/assinaturas novas fora desses limites não se sustenta integralmente.
- **Correção mínima:** extrair um pequeno componente/helper com responsabilidade real e trocar os helpers de quatro parâmetros por objeto; preservar suas asserções. Não fragmentar os testes só para reduzir o tamanho do agrupador describe.
- **Verificação:** AST dos locais indicados, testes afetados e typecheck.

## Correções anteriores e alegações dos registros

| Alegação/correção | Evidência atual |
|---|---|
| Review-001 B-1: parada normal deve abandonar, sem encerrar | `agentSdkSession.ts:44`, registry.abandonAll e `session-shutdown.test.ts` passam. Corrigida no caminho coberto. |
| Review-001: título/tipo da pergunta e Não entregue | Componentes e testes correspondentes presentes; suíte web passa. |
| Review-001: roteiro E2E por clone e workSeed | Escolha por clone e regressão unitária presentes; seed na suíte de integração passa. E2E continua dispensado. |
| Review-002 I-1: smoke V-31a deve pedir Write e diagnosticar artefato ausente | `session-real-claude.test.ts:13` e `:34` contêm as correções; v20-spike.md registra a ressalva. Não reexecutei Claude real; não reafirmo as duas passagens históricas como evidência nova. |
| Review-002 M-6 e parte de M-1 | terminalPorts usa NODE_ENV=test; seus testes passam; closeAll não existe mais. |
| “Todas as tarefas completed”, 26/26 | Confirmado estruturalmente pelo verificador. Não implica ausência dos cenários B-1–B-3. |
| “07.3 encerrada por decisão do usuário” | Preservado como aceite de processo, sem alegar sucesso nos E2E/smokes pela UI. |
| “ciclo seguinte ≤ 1 s” | Não demonstrado pelo loop nem por medição; I-1. |
| “nenhuma função/assinatura nova fora do limite” | Contrariado parcialmente pela medição AST; M-1. |

Os comandos “Pronto quando” de testes/typecheck abrangidos pelas suítes finais passam nos arquivos que existem atualmente. Mudanças de caminho, como answerMapper em application, já estão justificadas nos registros. O comando de smoke do worker e os experimentos de Claude real têm apenas evidência histórica. Os critérios integrais de sucesso das tarefas 03–05 não autorizam uma aprovação de conformidade enquanto B-1–B-3 persistirem, mesmo com seus testes atuais verdes.

## Atualizações de spec a discutir

1. **Contrato da timeline:** a §15 continua resumida, enquanto o histórico e task_03 descrevem reenvio de entradas alteradas e NOT_FOUND em falta de acesso. Consolidar as exceções aceitas no contrato e no V-27e; não alterar autorização para satisfazer uma paráfrase antiga.
2. **Documentação de produto/design:** PRODUCT.md ainda afirma que a execução foi removida; DESIGN.md limita as caixas da thread a draft/composer, enquanto a spec pede cartões de interação. Atualizar a documentação canônica para a feature aprovada. Essas inconsistências documentais não justificam remover a implementação nem mudar o escopo desta revisão.

A exceção B-26 já foi incorporada à spec e não foi reaberta como defeito do Flow Dev. O cache sem remoção de readChecks da revisão anterior permanece como dívida de baixo impacto; não há nova prova de crescimento relevante para promovê-lo a bloqueio.

## Prompt de correção

> Corrija a feature sessao-no-flow-dev, nesta ordem, preservando a dispensa de E2E/UI registrada em task_07.md:
>
> 1. **B-1 · task_03/03.1 + task_04/04.3:** coordenar publicação da sessão e preparação em terminalSessionController.ts, terminalOpenSteps.ts e sessionStarter.ts. O worker não pode declarar prompt perdido enquanto o open ainda o prepara. Adicione reprodução determinística com barreira, PostgreSQL real e consumidor concorrente; provar uma única inicialização com prompt/anexos completos. Preservar a falha real de prompt perdido e a idempotência.
> 2. **B-2 · task_05/05.2–05.3:** sessionControls.ts e DAO de controles devem processar end de sessão interrupted da própria máquina sem handle, sem retomar o Claude. Cancelar pendências, capturar artefatos, marcar ended e limpar controles. Testar restart → end sem mensagem e sessão de outra máquina.
> 3. **B-3 · task_02/02.3 + task_05/05.1:** corrigir a transição de pergunta tardia em sessionSignals.ts e broker. Testar end_turn → ask com PostgreSQL/runtime roteirizado: asking e Interromper funcional; manter B-30 e finais imutáveis.
> 4. **I-1 · task_05/05.2 + task_07/07.2:** medir as metas NFR-10/REQ-057 em ensaio local reproduzível com concorrência; registrar amostra, p95 e limitações. Corrigir o loop apenas se necessário e cobrir a correção de forma determinística. Não usar timeout maior nem reduzir workers para mascarar lentidão.
> 5. **M-1 · task_06/06.5 + task_07/07.3:** ajustar SessionComposer e os helpers de quatro parâmetros apontados, sem enfraquecer asserções.
>
> Restrições: ler as skills obrigatórias e rules; TS até 100 linhas, funções até 30 linhas, até três parâmetros; sem sleeps de sincronização, novas dependências ou alterações fora do escopo. Durante implementação, rodar só testes afetados e agrupar typecheck. Ao final, uma execução completa de API test, API test:integration sem TEST_DATABASE_URL, web test, pnpm typecheck, pnpm lint e pnpm build. Registrar a evidência. Solicitar nova revisão integral do que as correções afetarem; não alterar status/checkbox apenas para obter aprovação.

