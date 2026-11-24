---
status: completed
title: "Runtime e serviço"
type: backend
complexity: critical
---

# Task 05: Runtime e serviço

## Visão geral
Implementar o cliente JSON-RPC e o runtime Codex por stdio, um processo por sessão, conectados ao serviço existente. Entregar a primeira fatia funcional completa de conversa, pedidos, captura, controles e retomada, preservando a fila e os estados compartilhados.

<critical>
- LEIA `spec.md`, `_tasks.md`, `AGENTS.md`, as instruções locais aplicáveis e `.agents/rules/code-standards.md` antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de executar o “Pronto quando” e conferir o resultado.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Divida helpers e testes para respeitar 100 linhas por arquivo `.ts`, 30 linhas por função e até 3 parâmetros; não transforme uma mini-tarefa num diff maior que aproximadamente 200–300 linhas sem subdividi-la no plano.
- TESTES JUNTO COM O CÓDIGO: siga `.agents/skills/software-testing/SKILL.md` e `references/escolha-e-desenho.md`. Cenário → efeito específico esperado da spec → fronteira real. Sem asserções vagas, expectativas calculadas pela implementação ou mocks do comportamento sob teste. Controle relógio, concorrência e aleatoriedade.
- Ao começar, mude o status para `in_progress` aqui e no manifesto. Marque também cada teste atribuído somente com evidência. Use `completed` apenas após todas as mini-tarefas e critérios de sucesso; a revisão `spec-conformance` acontece uma vez na feature inteira, após as sete tarefas.
- Preserve alterações já presentes no workspace. Não faça commit, push, PR nem implemente sugestões fora do escopo.
</critical>

## Requisitos
- **REQ-111:** Iniciar no Codex local com clone, prompt, anexos, skills, escolha e modo confirmados, seguindo os estados da Spec C.
- **REQ-113:** Falha antes de thread/started DEVE virar launch_failed com motivo do Codex, inclusive modelo recusado, limite e processo.
- **REQ-119:** Sem ferramenta de perguntas, a sessão DEVE seguir por texto e ir a Aguardando você ao terminar a vez, sem erro de UI.
- **REQ-124:** Fila, idempotência, interromper/encerrar, recuperação e retomada DEVEM preservar mensagens e prazos das Specs C/D.
- **REQ-125:** Resume DEVE usar a mesma conversa, modelo, esforço e política; falha segue REQ-078 da Spec C.
- **NFR-19:** Executar codex do PATH sem shell, argumentos fixos, apenas stdio, sem daemon/porta; encerrar grupo de processo próprio.
- **US-15:** Cobrir abertura em até 10 s, próxima mensagem, indisponibilidade sem login e captura de spec, com integração das tarefas 03/04.
- **US-18:** Cobrir interrupção em até 5 s, cancelamento após reinício e retomada do mesmo histórico.
- **B-45:** Processos do terminal pessoal e de outra sessão DEVEM permanecer independentes; Flow Dev só controla seus filhos.
- **B-49:** Morte no meio da vez DEVE chegar como crashed e produzir Interrompida conforme REQ-076.
- **DEC-29:** Um app-server filho por sessão ativa, sem daemon compartilhado.
- **DEC-33:** Usar a flag confirmada e alternativa por texto; constante permite desligar sem mudar a UI.
- **§16 — integração:** Traduzir callbacks usando a porta existente e integrar a captura da Spec B e das sessões do plano.
- **§19 — session:** Registrar agente, versão, processo/código de saída, tipo de pedido, estado da flag e erros pelo método, sem conteúdo.
- **US-15.1:** Cenário de aceite: Abrir rota Codex com padrão local, prompt e resposta em até 10 s.
- **US-15.2:** Cenário de aceite: Enviar próxima mensagem depois da vez.
- **US-15.4:** Cenário de aceite: Spec criada aparece como artefato com skill e versão.
- **US-16.3:** Cenário de aceite: Perguntas por texto quando ferramenta não funciona.
- **US-18.1:** Cenário de aceite: Interromper comando em até 5 s com nota.
- **US-18.2:** Cenário de aceite: Reinício interrompe sessão e cancela pergunta.
- **US-18.3:** Cenário de aceite: Mensagem retoma mesma conversa e histórico.

## Interfaces
- **Consome:** `AgentSessionRuntime`, `RuntimeStartInput/RuntimeResumeInput`, `RuntimeHandle`, `RuntimeHandlers`, tradutores/opções da 03, probe/publisher da 04 e transporte secreto da 02.
- **Produz:** `CodexRpcClient` implementando `CodexRpc.request/onNotification/onServerRequest/close` da §15; tipos usados gerados pela versão mínima em `infra/terminal/codex/`, divididos para respeitar limites do projeto.
- **Produz:** `CodexAppServerRuntime.start(input): RuntimeHandle` e `resume(input): RuntimeHandle`, com `push`, `interrupt`, `close` e `abandon`. `close` termina voluntariamente; `abandon` não pode converter shutdown do serviço em Encerrada.
- **Produz:** `ScriptedCodexAppServer` como processo real por stdio em `packages/api/test/support/`, habilitado por `FLOW_DEV_CODEX_FAKE_SCRIPT` somente com `NODE_ENV=test`, roteiro isolado por sessão/clone.
- **Produz:** registro de produção `{ claude, codex }`, factory do probe conectada ao mesmo cliente e publisher no ciclo do worker. Disponibilidade continua dependendo de publicação válida e heartbeat.

## Mini-tarefas

- [x] **05.1 — Implementar enquadramento RPC e servidor de teste por stdio**
  - **Arquivos:** `packages/api/src/infra/terminal/codex/codexRpcClient.ts (criar)`; `packages/api/src/infra/terminal/codex/codexRpcFrames.ts (criar)`; `packages/api/src/infra/terminal/codex/codexProcess.ts (criar)`; `packages/api/src/infra/terminal/codex/protocol/ (criar apenas tipos usados, gerados na versão mínima)`; `packages/api/test/support/scriptedCodexAppServer.ts (criar)`; `packages/api/test/support/codexRpcScript.ts (criar)`; `packages/api/test/codex-rpc-client.test.ts (criar)`.
  - **Testes:** V-49h
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-rpc-client.test.ts` passa com processo filho real e JSON-RPC fragmentado/coalescido; nenhum Codex real é iniciado.
  - **Nota:** Testar IDs concorrentes, notificações, pedido do servidor, erro/método, EOF e resolução de pendentes. Hook de teste recusado em NODE_ENV diferente de test; não escolher binário arbitrário por input da API.

- [x] **05.2 — Abrir thread e primeira vez com anexos e identidade**
  - **Arquivos:** `packages/api/src/infra/terminal/codex/codexAppServerRuntime.ts (criar)`; `packages/api/src/infra/terminal/codex/codexSession.ts (criar)`; `packages/api/src/infra/terminal/codex/codexSessionStart.ts (criar)`; `packages/api/src/infra/terminal/codex/codexInputAttachments.ts (criar)`; `packages/api/test/codex-runtime-start.test.ts (criar)`.
  - **Testes:** V-49a, V-49g
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-runtime-start.test.ts` passa contra o app-server falso por stdio, verificando opções enviadas e callbacks.
  - **Nota:** initialize → extraRoots → thread/start → turn/start; thread/started grava o id via hook compatível. Ler versão efetiva antes de iniciar e falhar se antiga. Anexos de imagem usam localImage, outros ficam por caminho.

- [x] **05.3 — Conectar mensagens, pedidos e alternativa textual**
  - **Arquivos:** `packages/api/src/infra/terminal/codex/codexSessionEvents.ts (criar)`; `packages/api/src/infra/terminal/codex/codexSessionRequests.ts (criar)`; `packages/api/src/infra/terminal/codex/codexTurnQueue.ts (criar)`; `packages/api/src/application/services/terminal/messageDelivery.ts (somente se a porta exigir integração)`; `packages/api/test/codex-runtime-requests.test.ts (criar)`; `packages/api/test/codex-service-messages.test.ts (criar)`.
  - **Testes:** V-49b, V-54c
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-runtime-requests.test.ts test/codex-service-messages.test.ts` passa; pedidos do servidor recebem resposta no id correto, e próxima vez só começa após turn/completed.
  - **Nota:** No modo bypass, perguntas passam pelo broker. Pedidos de subagentes devem chegar à UI mesmo que seu texto/evento seja filtrado. Não usar turn/steer.

- [x] **05.4 — Interromper e encerrar somente o grupo desta sessão**
  - **Arquivos:** `packages/api/src/infra/terminal/codex/codexSessionControls.ts (criar)`; `packages/api/src/infra/terminal/codex/codexProcess.ts`; `packages/api/src/application/services/terminal/sessionControls.ts (integração mínima)`; `packages/api/test/codex-runtime-controls.test.ts (criar)`.
  - **Testes:** V-49c, V-49d
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-runtime-controls.test.ts` passa incluindo descendente real do falso servidor e segundo processo independente.
  - **Nota:** turn/interrupt usa id da vez; close faz unsubscribe e finaliza o grupo. Reusar utilitário processGroup se compatível, sem alterar comportamento dos agentes isolados.

- [x] **05.5 — Recuperar queda e retomar a conversa preservando escolhas**
  - **Arquivos:** `packages/api/src/infra/terminal/codex/codexSessionResume.ts (criar)`; `packages/api/src/application/services/terminal/sessionResume.ts`; `packages/api/src/application/services/terminal/sessionExit.ts`; `packages/api/src/application/services/terminal/orphanRecovery.ts (se necessário)`; `packages/api/test/codex-runtime-recovery.test.ts (criar)`; `packages/api/test/codex-service-recovery.test.ts (criar)`.
  - **Testes:** V-49e, V-49f, V-54d
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-runtime-recovery.test.ts test/codex-service-recovery.test.ts` passa com processo falso real e Postgres no teste de serviço.
  - **Nota:** Nada de resume automático sem mensagem. Uma resposta não pode reabrir pedido cancelado após restart; falha de resume encerra e marca a mensagem Não entregue.

- [x] **05.6 — Registrar runtime, publicar catálogo e provar captura no serviço**
  - **Arquivos:** `packages/api/src/infra/sessionWorkerParts.ts`; `packages/api/src/infra/sessionWorkerComposition.ts`; `packages/api/src/infra/registeredSessionAgents.ts`; `packages/api/src/infra/terminal/codex/codexCatalogTransport.ts`; `packages/api/src/application/services/terminal/sessionStarter.ts`; `packages/api/src/application/services/terminal/sessionSignals.ts`; `packages/api/src/application/services/terminal/sessionLog.ts`; `packages/api/test/codex-service-start.test.ts (criar)`; `packages/api/test/session-agent-runtime.test.ts`; `packages/api/test/session-plans-regression.test.ts`; `packages/api/src/application/services/terminal/sessionPurpose.ts`; `packages/api/src/controllers/terminalSessionController.ts`.
  - **Testes:** V-54a, V-54b
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-service-start.test.ts test/session-agent-runtime.test.ts test/session-plans-regression.test.ts` passa; `rtk pnpm --dir packages/api typecheck` e `rtk pnpm --dir apps/web typecheck` passam.
  - **Nota:** Habilitar registro só junto do runtime e publisher funcionais. Provar sessão de rota Codex com Claude ausente, texto, perguntas, artefato capturado e versão registrada pelo fluxo completo com Postgres. Conectar prompt por agente dos três propósitos aos builders da 03 no preview e na abertura; representação no histórico usa [skill], e o runtime converte a invocação em entrada tipada.

## Detalhes de implementação
Leia layered-backend. Use stdio enquadrado em JSON-RPC conforme versão confirmada; stderr não deve poluir stdout do protocolo nem persistir conteúdos privados. O fake precisa falar o protocolo, não chamar handlers do runtime diretamente. A suite de serviço exercita o worker, os controllers e o banco existentes, com clock controlado quando necessário. Não duplicar máquinas de estado.

### Arquivos relevantes
- `packages/api/src/infra/sessionWorkerParts.ts`: construção do broker, handlers e runtimes.
- `packages/api/src/infra/sessionWorkerComposition.ts`: ciclo e shutdown com abandonAll.
- `packages/api/src/application/services/terminal/sessionSignals.ts`: sinais de hooks e id da conversa.
- `packages/api/src/application/services/terminal/sessionResume.ts`: retomada já repassa modelo e esforço.
- `packages/api/src/infra/agents/processGroup.ts`: controle de grupo existente.
- `packages/api/src/infra/terminal/agentSdkSessionRuntime.ts`: padrão existente a preservar, sem reimplementar.

### Arquivos afetados
Os caminhos de alteração estão em cada mini-tarefa; os marcados “criar” ainda não existem. Helpers adicionais pertencem ao mesmo diretório da responsabilidade e devem ser registrados antes da edição. Não usar uma renomeação geral para acomodar a feature.

### Decisões relacionadas
DEC-29 e DEC-33 implementadas aqui; DEC-30/31/32 são consumidas. Registro/rollout só ao final deste passo, sob FLOW_DEV_TERMINAL_ENABLED.

## Premissas
Tipos gerados só dos métodos usados e divididos em arquivos menores que 100 linhas; nenhum novo SDK obrigatório. O fake é um processo de teste, a compatibilidade real depende do V-45 e V-52. Não instalar Codex ou fazer login pelo Flow Dev.

## Testes atribuídos
Cada ID abaixo tem um único dono no plano; grupos da matriz da spec foram expandidos em casos concretos. IDs IT-50x são complementos deste plano, não novos requisitos de produto.

- [x] **V-49h** (05.1): Frames fragmentados/unidos, respostas fora de ordem e request do servidor → ids corretos, nenhuma promessa sem destino após EOF, erros trazem método; teste fora de NODE_ENV=test não usa fake; produção só executa PATH com argumentos fixos e shell=false · cliente e processo por stdio reais.
- [x] **V-49a** (05.2): Start válido com modelo/esforço/anexos/skill → initialize/extraRoots/thread/start/turn/start corretos, thread/started emite id e running; duas sessões têm processos próprios · runtime + app-server falso reais.
- [x] **V-49g** (05.2): Processo falha ou modelo/limite é recusado antes do início → onExit failed com motivo, persistência launch_failed; versão antiga não chega a turn/start · runtime + falso; serviço + Postgres para estado.
- [x] **V-49b** (05.3): Servidor pede pergunta/aprovação, inclusive de subagente e segredo → runtime aguarda pessoa e devolve resposta no request id correto, pergunta em bypass não é liberada automaticamente · processo real + broker/transportes.
- [x] **V-54c** (05.3): Mensagem durante vez ativa, reenvio com mesma requestKey e pergunta textual com flag desligada → mensagem fica Na fila, entrega única após fim; alternativa textual vai para Aguardando você e recebe próxima mensagem · serviço/controllers + Postgres + app-server falso.
- [x] **V-49c** (05.4): Turn ativa com pedido pendente recebe interrupt → turn/interrupt usa threadId/turnId corretos, pedido é cancelado, nota “Interrompido por você” persiste e sessão aguarda; runtime/serviço + processo e Postgres reais.
- [x] **V-49d** (05.4/05.6): Close encerra o grupo próprio e preserva o segundo servidor; worker/SessionEnd captura o artefato e a conversa fica encerrada · grupos reais + serviço/Postgres.
- [x] **V-49e** (05.5/05.6): Processo real reporta `crashed`; SessionExitHandling/Postgres marca Interrompida, cancela pedido pendente e grava a nota · worker + processo real.
- [x] **V-49f** (05.5): Resume usa `thread/resume` com id, modelo e política preservados, depois `turn/start` com esforço e mensagem; erro do servidor encerra a sessão e marca a mensagem Não entregue · runtime/processo falso e worker/Postgres reais.
- [x] **V-54d** (05.5): Worker reiniciado cancela pedido pendente, não resume sem mensagem e, ao receber uma, retoma uma vez a conversa; `abandonAll` não encerra voluntariamente · worker + Postgres reais.
- [x] **V-54a** (05.6): Rota, geração e plano preflight/open usam a escolha Codex; serviço persiste thread/modelo/esforço/versão, Stop captura `spec.md` com skill e versão e captura `task_NN` aplica a regra do plano sem entrada skill · serviço + Postgres + checkout + app-server falso.
- [x] **V-54b** (05.6): Regressões Claude mantidas; logs Codex registram método/versão/processo/flag sem prompt nem conteúdo de pedido · testes de runtime, broker, localSettings e captura + Postgres.

## Verificação da tarefa
- Comandos de shell usam `rtk`, conforme `/home/mauricio/.codex/RTK.md`.
- Durante a implementação, rode só os arquivos afetados. Em `packages/api/test/`, use `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts <arquivo>`; em `packages/api/src/`, omita `--config`.
- Agrupe as edições antes do typecheck. Se alterar contratos consumidos pela web, confira também `rtk pnpm --dir apps/web typecheck`.
- No fechamento de uma tarefa que alterou a API, rode `rtk pnpm --dir packages/api test` e `rtk pnpm --dir packages/api test:integration` uma vez. Para a web, `rtk pnpm --dir apps/web test` uma vez. Repita somente falhas; depois confirme com a suíte completa.
- Não defina `TEST_DATABASE_URL` localmente. A integração provisiona Postgres descartável; requer `pg_config`, `initdb` e `pg_ctl`. Não aumente timeouts nem reduza workers para esconder lentidão.
- `packages/api/package.json` não tem script de lint. `rtk pnpm lint` é o comando do monorepo. Build e Playwright ficam na tarefa 07, que cobre o fluxo visível alterado; se uma mini-tarefa mudar rotas ou configuração de build, execute o gate pertinente nela e registre a razão.

## Critérios de sucesso
- Todas as mini-tarefas e testes atribuídos marcados apenas depois de comprovados.
- Doze casos passam com fronteiras reais de stdio/processo/banco, sem fake que contorne o runtime.
- Conversa P1 funciona antes da extensão da UI; captura e controles continuam nos caminhos existentes.
- Sem órfãos, retomada mantém escolha e Claude permanece funcional; suites/typechecks pertinentes passam.
- Respeitar as regras de código, camadas e autorização do projeto; registrar qualquer gate indisponível sem declarar sucesso.

## Registro de execução
<!-- Acrescentar data, mini-tarefa, mudança, comandos/resultados, desvios e limitações. Sem evidência de implementação na criação deste plano. -->

- 2026-11-23 · 05.1 · Enquadramento JSONL, RPC concorrente, processo isolado e fake real por stdio entregues. Helpers `codexRpcDispatch.ts` e `codexRpcScript.ts` foram separados para respeitar o limite de linhas. Evidência: `test/codex-rpc-client.test.ts` — 3 testes passaram; typecheck passou.
- 2026-11-23 · 05.2 · Runtime start consulta o probe e valida modelo/esforço atuais, inicializa, registra extraRoots, abre thread/turn, converte skill e imagem e emite hooks/texto. Dois processos concorrentes tiveram PIDs distintos. `codex-service-start.test.ts` fecha V-49g com SessionStarter/ExitHandling/DAO/Postgres reais e modelo recusado antes de turn/start. Helpers `codexSessionLaunch.ts`, `codexSessionStart.ts`, `codexInputAttachments.ts` e `protocol/codexMethods.ts` foram adicionados para separar contratos/construção. Evidência: `test/codex-runtime-start.test.ts` (3 testes) e `test/codex-service-start.test.ts` (1 teste) passaram; typecheck passou.
- 2026-11-23 · 05.3 · Runtime agora roteia perguntas/aprovações por RuntimeHandlers, responde no id original, mantém perguntas de subagentes, não autoaprova pergunta secreta em bypass e aplica a tradução de decisões do Codex. Fila serializa entradas até `turn/completed`; teste de serviço usa Postgres/MessageDelivery e reenvio idempotente, confirmando que o texto desligado segue por turns normais. `codexSessionEvents.ts`, `codexSessionRequests.ts` e `codexTurnQueue.ts` concentram estas fronteiras. Evidência: `test/codex-runtime-requests.test.ts` e `test/codex-service-messages.test.ts` passaram.

- 2026-11-24 · 05.4 · Interrupção agora usa helper dedicado com threadId/turnId; close/abandon desligam listeners e encerram pelo grupo próprio. O teste de integração criou dois app-servers stdio, cada qual com descendente real, usou SessionControlsStep/DAOs/Postgres para interromper/cancelar pedido e encerrar apenas o primeiro grupo; o segundo permaneceu vivo até seu próprio end. `test/support/codexControlsSupport.ts` foi criado para manter teste e fixtures abaixo do limite de linhas. Captura no fechamento fica para V-49d/05.6, quando o runtime for ligado ao SessionExitHandling real. Evidência: `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-runtime-controls.test.ts` — 1 teste passou; `rtk pnpm --dir packages/api typecheck` passou; `rtk git diff --check` passou.
- 2026-11-24 · 05.5 · Implementado `thread/resume` no mesmo app-server por sessão, com choices/política persistidas e primeira mensagem da fila; falha do método propaga `failed` para o fluxo existente, encerrando e marcando a mensagem Não entregue. Serviço real verifica ausência de retomada sem mensagem, cancelamento após restart, retomada única e `abandonAll` sem Encerrada. V-49e runtime cobre saída de processo real como `crashed`; transição de domínio com Postgres depende da ligação de handlers em 05.6. Evidência: `test/codex-runtime-recovery.test.ts` e `test/codex-service-recovery.test.ts` — 4 testes passaram; API typecheck passou.
- 2026-11-24 · 05.6 · Registrados runtimes Claude/Codex e transporte de catálogo via JSON-RPC `model/list` mais `codex login status`; o worker faz heartbeat antes da leitura inicial e agenda renovação de 600.000 ms. O Codex grava versão via callback de runtime, informa start/exit/request por método sem conteúdo e emite `SessionEnd` para o recorder. Planos sem catálogo agora recusam Codex como indisponível. Fixtures extras `codexWorkerFlowSupport.ts`, `codex-service-flow.test.ts`, `codex-service-plan-flow.test.ts`, `codex-open-purpose.test.ts` e `codex-catalog-transport.test.ts` foram adicionadas para exercitar clone, escolhas e captura por fronteiras reais. Evidência: API `test` — 124 arquivos/795 testes passaram; `test:integration` — 153 arquivos/757 testes passaram, 2 arquivos/5 testes skipped preexistentes; `packages/api typecheck`, `apps/web typecheck`, `pnpm lint` e `git diff --check` passaram. As cópias Web não foram alteradas nesta task.

- 2026-11-23 · 05.1 · Implementados parser JSONL fragmentado/coalescido, cliente JSON-RPC concorrente com notifications/server requests/error/EOF, spawn codex sem shell com `app-server` fixo e grupo de processo dedicado, além do servidor falso real por stdio e roteiro JSON. Factory de transporte do catálogo segue como porta; conexão compartilhada fica em 05.6 conforme a task04/05. Evidência: `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-rpc-client.test.ts` — 3 testes passaram; `rtk pnpm --dir packages/api typecheck` passou.
- 2026-11-24 · correções da review-002 · 05.2/05.4: V-49a sincroniza com o log `codex_turn_started` antes de fechar (B-1); `CodexSession` dividida em estado, abertura, saída e envio de vez (`codexSessionState/Startup/Exit.ts`, `codexTurnDispatch.ts`), `agentSdkSession.ts` com 98 linhas (I-1); tipos do protocolo gerados por `codex app-server generate-ts` 0.159.3 em `protocol/generated/` via `pnpm --dir packages/api codex:protocol` e usados em threads, turnos, permissões, `fileChange` e unsubscribe (I-2); close durante `thread/start` e `turn/start` provado com filho falso controlado, mutações das barreiras detectadas, e unsubscribe rejeitado ainda encerra o grupo (I-4); `accept_edits` pelo runtime com o diff correlacionado (M-1); `changes` liberados em `item/completed` (M-2); constantes e import de `StringDecoder` (M-3). Verificação (sem TEST_DATABASE_URL): `pnpm --dir packages/api test` 129 arquivos/804 testes; `pnpm --dir packages/api test:integration` 157 arquivos/770 testes, 5 skipped; `pnpm --dir apps/web test` 101 arquivos/520 testes; typecheck da API e da web e `pnpm lint` com exit 0. Limitação: a prova real de retomada (start → app-server morto → resume com inferência) continua para o smoke da 07.
