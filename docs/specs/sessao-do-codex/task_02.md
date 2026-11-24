---
status: completed
title: "Dados e contratos compartilhados"
type: backend
complexity: high
---

# Task 02: Dados e contratos compartilhados

## Visão geral
Adicionar os dados e extensões neutras exigidos pelo Codex sem habilitá-lo ainda. Entregar contratos que os tradutores, o catálogo e a tela possam consumir preservando pedidos e sessões existentes do Claude.

<critical>
- LEIA `spec.md`, `_tasks.md`, `AGENTS.md`, as instruções locais aplicáveis e `.agents/rules/code-standards.md` antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de executar o “Pronto quando” e conferir o resultado.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Divida helpers e testes para respeitar 100 linhas por arquivo `.ts`, 30 linhas por função e até 3 parâmetros; não transforme uma mini-tarefa num diff maior que aproximadamente 200–300 linhas sem subdividi-la no plano.
- TESTES JUNTO COM O CÓDIGO: siga `.agents/skills/software-testing/SKILL.md` e `references/escolha-e-desenho.md`. Cenário → efeito específico esperado da spec → fronteira real. Sem asserções vagas, expectativas calculadas pela implementação ou mocks do comportamento sob teste. Controle relógio, concorrência e aleatoriedade.
- Ao começar, mude o status para `in_progress` aqui e no manifesto. Marque também cada teste atribuído somente com evidência. Use `completed` apenas após todas as mini-tarefas e critérios de sucesso; a revisão `spec-conformance` acontece uma vez na feature inteira, após as sete tarefas.
- Preserve alterações já presentes no workspace. Não faça commit, push, PR nem implemente sugestões fora do escopo.
</critical>

## Requisitos
- **REQ-118:** O campo secreto DEVE entregar a resposta ao runtime, mas a resposta guardada DEVE ser somente (resposta oculta). A tela fica com a tarefa 06.
- **NFR-20:** Diffs de pedidos DEVEM ser persistidos com as mesmas permissões dos pedidos existentes; respostas secretas NÃO DEVEM ser guardadas.
- **NFR-21:** A sessão DEVE suportar a versão efetiva do agente persistida e registrada; a rejeição da versão inferior é exercitada na tarefa 04.
- **§14:** Aplicar migration com rollback para agent_version, codex_status e kinds file_change/extra_permission, preservando dados atuais e claude_session_id.
- **§15 — contratos:** Estender as procedures existentes, sem criar procedures novas: choice em route, allow_session, offers/alwaysScope, secret e metadados por modelo.
- **§18 — validação:** Decisões não oferecidas DEVEM falhar com decision_not_offered; respostas DEVEM respeitar opções, escolha única e Outra permitida.

## Interfaces
- **Consome:** `SessionRequestDao`, `SessionHostDao`, `SessionStatusDao`, `AgentChoice`, `RuntimePermissionRequest/Result` e o contrato secreto confirmado no spike.
- **Produz:** `PermissionDecision = "allow" | "allow_session" | "allow_always" | "deny"`; pedidos de permissão com `kind: "command" | "file_change" | "extra_permission"`, `offers: PermissionDecision[]` e `alwaysScope: "project" | "machine" | null`; perguntas com identificador do Codex preservado, `secret` e permissão explícita de Outra (usar `allowOther` internamente).
- **Produz:** `CodexStatus` em `application/terminal/codexCatalog.ts`, com `available, reason, version, models: { id, label, isDefault, efforts, defaultEffort }[], refreshedAt`; `SessionHostDao.codexStatus(hostId)` e `publishCodexStatus({ hostId, status })`. Metadados por modelo são adicionais a `AgentAvailability.models/efforts`, mantendo os consumidores atuais compilando.
- **Produz:** `OpenPurpose` com `{ kind: "route"; choice: AgentChoice }` e PreviewPurpose de rota aceitando choice para compor o prompt. Entrada legada sem choice recebe DEFAULT_SESSION_CHOICE no servidor; o domínio usa choice efetiva. O preview devolve o padrão e o resolver grava a escolha sem alterar sessões já existentes. O comportamento do resolver e da UI será conectado depois.
- **Produz:** mapeamento em código para `agentSessionId` preservando a coluna física `claude_session_id`, e `agentVersion` anulável. Não criar tabelas próprias de conversa Codex.
- As extensões de `RuntimePermissionResult` devem ter discriminante explícito para decisão/escopo e preservar a variante usada pelo Claude. Não codificar `allow_session` como um array de permissões persistentes.

## Mini-tarefas

- [x] **02.1 — Migrar os dados preservando sessões atuais**
  - **Arquivos:** `packages/api/drizzle/0051_codex_sessions.sql (criar; conferir número livre)`; `packages/api/drizzle/0051_codex_sessions_rollback.sql (criar)`; `packages/api/drizzle/meta/_journal.json`; `packages/api/src/infra/database/schema/tasks/terminal.ts`; `packages/api/src/infra/database/schema/tasks/sessionInteraction.ts`; `packages/api/test/databaseMigrations.ts`; `packages/api/test/codex-sessions-migration.test.ts (criar)`.
  - **Testes:** IT-501, IT-502
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-sessions-migration.test.ts` passa sobre Postgres descartável; schema Drizzle, journal e lista de migrations concordam.
  - **Nota:** Não alterar a 0050 existente. No rollback, demonstrar a pré-condição para pedidos dos novos kinds; não apagar silenciosamente pedidos para fazer a constraint passar.

- [x] **02.2 — Estender pedidos, resultados e metadados persistidos**
  - **Arquivos:** `packages/api/src/application/terminal/sessionInteraction.ts`; `packages/api/src/application/terminal/sessionInteractionPorts.ts`; `packages/api/src/application/terminal/agentSessionRuntime.ts`; `packages/api/src/application/terminal/sessionStatusPorts.ts`; `packages/api/src/application/database/dao/terminalSessionDao.ts`; `packages/api/src/infra/database/dao/terminal/drizzleSessionRequestDao.ts`; `packages/api/src/infra/database/dao/terminal/drizzleSessionStatusDao.ts`; `packages/api/src/infra/database/dao/terminal/drizzleTerminalSessionDao.ts`; `packages/api/src/infra/database/dao/terminal/terminalSessionWrites.ts`; `packages/api/src/infra/database/dao/terminal/drizzleSessionTimelineDao.ts`; `packages/api/src/infra/database/dao/terminal/sessionTimelineQueries.ts`; `packages/api/test/codex-request-contract.test.ts (criar)`; `packages/api/src/application/services/terminal/sessionTimelineReader.ts`; `packages/api/src/application/services/terminal/sessionTimelineMerge.ts`.
  - **Testes:** IT-503, IT-504
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-request-contract.test.ts` passa, inclusive pedidos legados sem campos novos.
  - **Nota:** Adicionar defaults na leitura para Claude; mapeadores auxiliares novos ficam junto ao dono e respeitam os limites de arquivo. O broker continua único.

- [x] **02.3 — Publicar os tipos de catálogo e de escolha na rota**
  - **Arquivos:** `packages/api/src/application/terminal/codexCatalog.ts (criar)`; `packages/api/src/application/terminal/sessionAgentCatalog.ts`; `packages/api/src/application/terminal/sessionInteractionPorts.ts`; `packages/api/src/application/terminal/sessionPurposeInput.ts`; `packages/api/src/application/services/terminal/sessionPurpose.ts`; `packages/api/src/schemas/terminal.ts`; `packages/api/src/infra/database/dao/terminal/drizzleSessionHostDao.ts`; `packages/api/src/application/terminal/codexContracts.test.ts (criar)`; `packages/api/test/terminal-preflight-purpose.test.ts`; `packages/api/test/terminal-open.test.ts`; `packages/api/test/session-agent-runtime.test.ts`; `apps/web/src/test/session.ts`.
  - **Testes:** IT-505
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run src/application/terminal/codexContracts.test.ts` passa; `rtk pnpm --dir packages/api typecheck` e `rtk pnpm --dir apps/web typecheck` passam após agrupar as extensões.
  - **Nota:** Metadados por modelo devem distinguir label, id, esforços suportados e modelo padrão. Não ligar a disponibilidade estática do Codex ainda. Para route, input sem choice continua aceito com default do servidor. Os consumidores antigos não devem deixar de compilar antes da atualização da UI.

- [x] **02.4 — Validar apenas respostas e decisões realmente oferecidas**
  - **Arquivos:** `packages/api/src/application/services/terminal/permissionDecisionValidation.ts`; `packages/api/src/application/services/terminal/questionAnswerValidation.ts`; `packages/api/src/application/services/terminal/permissionDisplayRules.ts`; `packages/api/src/controllers/sessionRequestController.ts`; `packages/api/src/controllers/taskErrorMapper.ts`; `packages/api/src/application/services/terminal/sessionErrorCatalog.ts`; `packages/api/src/application/services/tasks/taskErrors.ts`; `packages/api/test/codex-request-validation.test.ts (criar)`; `packages/api/src/application/services/terminal/questionAnswerValidation.test.ts`; `packages/api/src/application/services/terminal/permissionRequestSummarizer.test.ts`.
  - **Testes:** V-47h, V-47i, V-47j
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-request-validation.test.ts` passa com banco e controller reais.
  - **Nota:** A timeline de file_change e extra_permission continua type=permission; o controller deve aceitá-los como aprovações. Defaults legados não podem oferecer allow_session ao Claude.

- [x] **02.5 — Entregar segredos sem persistir o texto e separar os escopos de aprovação**
  - **Arquivos:** `packages/api/src/application/services/terminal/answerMapper.ts`; `packages/api/src/application/services/terminal/answerMapper.test.ts (criar)`; `packages/api/src/application/services/terminal/answerDispatch.ts`; `packages/api/src/application/services/terminal/secretAnswerReceiver.ts (criar)`; `packages/api/src/application/services/terminal/pendingRequestRegistry.ts`; `packages/api/src/application/services/terminal/sessionRequestBroker.ts`; `packages/api/src/application/services/terminal/requestCancellation.ts`; `packages/api/src/application/terminal/secretAnswerTransport.ts (criar, porta e envelope efêmero)`; `packages/api/src/controllers/sessionRequestController.ts`; `packages/api/src/infra/database/secretAnswerChunks.ts (criar)`; `packages/api/src/infra/database/postgresSecretAnswerSender.ts (criar)`; `packages/api/src/infra/database/postgresSecretAnswerListener.ts (criar)`; `packages/api/src/infra/sessionInteractionComposition.ts`; `packages/api/src/infra/sessionWorkerParts.ts`; `packages/api/src/infra/sessionWorkerComposition.ts`; `packages/api/src/infra/database/client.ts`; `packages/api/test/codex-secret-answer.test.ts (criar)`; `packages/api/test/secret-answer-process-listener.ts (criar)`; `packages/api/test/codex-permission-scope.test.ts (criar)`; `packages/api/test/session-worker-support.ts`; `packages/api/test/terminal-harness.ts`; `packages/api/test/task-api-support.ts`; `packages/api/test/session-timeline-access.test.ts`; `packages/api/test/issue-deletion-terminal.test.ts`.
  - **Testes:** V-47k, IT-506, IT-507
  - **Pronto quando:** `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-secret-answer.test.ts test/codex-permission-scope.test.ts` passa com dois processos para a fronteira secreta; runtime recebe o valor exato e consultas ao banco/timeline/log só revelam o marcador.
  - **Nota:** Este passo só começa com o contrato secreto resolvido na 01.3. Redigir a resposta no controller e depois entregá-la ao worker pelo banco não satisfaz o requisito; guardar plaintext temporário no banco também não.

## Detalhes de implementação
Leia layered-backend e trpc-nextjs. Contratos ficam em application e SQL em infra. Prefira extensões compatíveis e defaults de leitura até os consumidores serem atualizados. Os campos secret/allowOther e offers/alwaysScope devem atravessar payload → persistência → timeline; nenhum deles pode existir só num tipo TypeScript.

### Arquivos relevantes
- `packages/api/src/application/terminal/sessionInteraction.ts`: hoje só question/permission e allow/allow_always/deny.
- `packages/api/src/application/services/terminal/answerMapper.ts`: hoje envia toda sugestão permanente para localSettings.
- `packages/api/src/infra/database/schema/tasks/sessionInteraction.ts`: hosts, requests e constraints reais.
- `packages/api/src/application/terminal/sessionAgentCatalog.ts`: hoje modelos/esforços são arrays globais por agente.
- `packages/api/src/controllers/sessionRequestController.ts`: resposta passa pelo banco antes do worker.

### Arquivos afetados
Os caminhos de alteração estão em cada mini-tarefa; os marcados “criar” ainda não existem. Helpers adicionais pertencem ao mesmo diretório da responsabilidade e devem ser registrados antes da edição. Não usar uma renomeação geral para acomodar a feature.

### Decisões relacionadas
DEC-30: estender a porta sem segundo broker/tabelas de conversa. O transporte de segredo segue o contrato resolvido no spike, sem inferir autorização para mudar decisões existentes.

## Premissas
0051 é o próximo número livre observado, a conferir. Novos contratos podem ter helpers separados para preservar limites. O transporte secreto aprovado no spike usa `pg_notify`: inscrever o worker antes de aceitar respostas, correlacionar blocos por pedido/entrega, limitar bytes e expiração, e só persistir marcador após transição condicional do pedido pendente. A resposta do controller espera confirmação sem guardar o texto para retry.

## Testes atribuídos
Cada ID abaixo tem um único dono no plano; grupos da matriz da spec foram expandidos em casos concretos. IDs IT-50x são complementos deste plano, não novos requisitos de produto.

- [x] **IT-501** (02.1): Banco com sessões Claude e pedidos existentes recebe a migration → dados, modelos, ids e defaults anteriores permanecem; novas colunas e kinds aceitam os valores definidos · Postgres real.
- [x] **IT-502** (02.1): Aplicar e reverter a migration num banco de teste → schema anterior volta sob a pré-condição documentada; com pedidos novos incompatíveis o procedimento não perde dados silenciosamente · SQL real.
- [x] **IT-503** (02.2): Persistir pedido de comando, file_change e extra_permission e ler timeline junto de um pedido Claude antigo → os três saem como type=permission, com offers/escopo corretos, e o legado mantém sua apresentação · DAO + Postgres + timeline reais.
- [x] **IT-504** (02.2): Gravar id da conversa Codex e versão e reler sessão → agentSessionId/agentVersion preservam os valores, sem renomear a coluna física nem alterar sessões antigas com versão nula · Postgres real.
- [x] **IT-505** (02.3): Schema recebe route com AgentChoice e catálogo de dois modelos com esforços distintos → input válido preserva escolha e DTO distingue label/id/default/esforços; shape inválido é recusado e consumidor legado compila · Zod real e contratos públicos.
- [x] **V-47h** (02.4): Decisão não está em offers (allow_session em Claude/grantRoot, allow_always sem regra ou extra_permission com escopo permanente) → decision_not_offered e pedido permanece pending · controller + Postgres reais.
- [x] **V-47i** (02.4): Responder pergunta Codex com rótulo desconhecido, escolhas múltiplas ou Outra proibida → resposta recusada; rótulo válido e Outra permitida são aceitos, sem confundir ids de perguntas com textos iguais · validação + controller reais.
- [x] **V-47j** (02.4): Motivo de recusa com 2.000/2.001 caracteres e diff total com 20.000/20.001 → motivo no limite aceito e excesso recusado; exibição do diff aplica limite e marcador da Spec C · validação e sumarizador reais.
- [x] **V-47k** (02.5): Responder segredo válido por outro processo e disputar resposta/cancelamento → somente uma entrega autorizada recebe texto exato; banco, timeline e logs guardam só (resposta oculta), e reinício não reapresenta o segredo · transporte confirmado + worker + Postgres reais.
- [x] **IT-506** (02.5): Responder allow_session/allow_always no Codex e allow_always no Claude → resultados carregam respectivamente decisão efêmera, regra original de máquina e destino localSettings do projeto, sem reescrever a sugestão Codex · mapper/broker/dispatch reais + Postgres.
- [x] **IT-507** (02.5): Pedido de arquivo com diff persistido → membro autorizado lê o diff e não membro tem acesso negado; exclusão da Issue remove pedidos, inclusive novos kinds · controllers/DAO/autorização + Postgres reais.

## Verificação da tarefa
- Comandos de shell usam `rtk`, conforme `/home/mauricio/.codex/RTK.md`.
- Durante a implementação, rode só os arquivos afetados. Em `packages/api/test/`, use `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts <arquivo>`; em `packages/api/src/`, omita `--config`.
- Agrupe as edições antes do typecheck. Se alterar contratos consumidos pela web, confira também `rtk pnpm --dir apps/web typecheck`.
- No fechamento de uma tarefa que alterou a API, rode `rtk pnpm --dir packages/api test` e `rtk pnpm --dir packages/api test:integration` uma vez. Para a web, `rtk pnpm --dir apps/web test` uma vez. Repita somente falhas; depois confirme com a suíte completa.
- Não defina `TEST_DATABASE_URL` localmente. A integração provisiona Postgres descartável; requer `pg_config`, `initdb` e `pg_ctl`. Não aumente timeouts nem reduza workers para esconder lentidão.
- `packages/api/package.json` não tem script de lint. `rtk pnpm lint` é o comando do monorepo. Build e Playwright ficam na tarefa 07, que cobre o fluxo visível alterado; se uma mini-tarefa mudar rotas ou configuração de build, execute o gate pertinente nela e registre a razão.

## Critérios de sucesso
- Todas as mini-tarefas e testes atribuídos marcados apenas depois de comprovados.
- Migration e rollback exercitados, contratos antigos continuam compilando e lendo dados.
- Cada decisão é validada contra offers; segredo nunca fica como plaintext persistido.
- API e web typecheck passam; suítes da API executadas no fechamento; lint pertinente sem erros.
- Respeitar as regras de código, camadas e autorização do projeto; registrar qualquer gate indisponível sem declarar sucesso.

## Registro de execução
<!-- Acrescentar data, mini-tarefa, mudança, comandos/resultados, desvios e limitações. Sem evidência de implementação na criação deste plano. -->
- 2026-11-23 — Contrato secreto fechado na 01.3: `pg_notify` efêmero, com os arquivos de transporte e a prova V-47k nomeados acima. O usuário aprovou a exceção à DEC-17; detalhes e limites estão em `v45-spike.md`.
- 2026-11-23 — 02.1 concluída: criada 0051 (0050 preservada), `agent_version`, `codex_status`, kinds novos, journal e lista de migrações; rollback recusa perder versões/status/kinds Codex e só remove os campos quando estão vazios. `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-sessions-migration.test.ts` passou (3 testes); `rtk pnpm --dir packages/api typecheck` e `rtk git diff --check` passaram. A primeira execução expôs que o harness de integração já aplica as migrações atuais; o teste foi ajustado para reverter 0051 antes de exercitá-la.
- 2026-11-23 — 02.2 concluída: pedidos agora preservam kinds, offers/escopo, ids de pergunta e sinalizadores secret/Outra; a timeline continua expondo permissões no formato comum e fornece defaults para linhas legadas. `agentSessionId` mapeia `claude_session_id`; `agentVersion` continua anulável. `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-request-contract.test.ts` passou (3 testes) e `rtk pnpm --dir packages/api typecheck` passou. A primeira asserção encontrou a pergunta legada com duas perguntas; foi corrigida para verificar o item específico sem depender da ordem.
- 2026-11-23 — 02.3 concluída: `CodexStatus`, metadados por modelo, leitura/publicação do status do host e rota com choice opcional foram adicionados; legado recebe Claude · Opus · Máximo no resolver e a escolha explícita é gravada. Unitário `codexContracts.test.ts` (2), integrações de abertura/runtime/preflight (17), API typecheck e web typecheck passaram. Alterações adicionais necessárias: atualizar expectativas de rota dos testes existentes e o fixture permission compartilhado da web com `kind/offers/alwaysScope`; o primeiro web typecheck identificou esse fixture e o segundo passou.
- 2026-11-23 — 02.4 concluída: `decision_not_offered` é um BAD_REQUEST seguro; decisões são conferidas contra `offers`, incluindo kinds novos. Respostas usam id Codex ou texto legado e respeitam allowOther/seleção única. Testes unitários de validação/sumarização (23) e testes reais controller/Postgres (14) passaram; API e web typecheck passaram. Cobertura de diff verificou 20.000 e 20.001 caracteres e marcador de corte.
- 2026-11-23 — 02.5 implementada: resposta secreta via blocos limitados em `pg_notify`, com ACK por `deliveryId`, TTL de montagem, listener do worker e resolução em memória; o banco/timeline guardam apenas `(resposta oculta)` e a API falha sem listener/ACK. Há prova com processo worker filho, conexões API/worker distintas, cancelamento vencedor, e verificações de armazenamento/log/timeline. `allow_session` mapeia para decisão efêmera; `allow_always` Codex devolve regra original com escopo machine; Claude mantém `localSettings`. Diff `file_change` foi coberto na leitura autorizada e na exclusão da Issue. A implementação foi dividida em `secretAnswerChunks`, sender, listener e receiver, e o fixture passou a expor a URL do Postgres para conexões independentes. Verificações focadas: `codex-secret-answer` + `codex-permission-scope` (7), timeline/deleção (15), typechecks API/web e `git diff --check` passaram. `rtk pnpm --dir packages/api test` passou (115 arquivos/768 testes); `test:integration` passou após corrigir as cinco expectativas antigas (138 arquivos/731 testes, 2 arquivos e 5 casos skipped); `rtk pnpm --dir apps/web test` passou (99 arquivos/502 testes); `rtk pnpm lint` passou. Task 02 concluída.
- 2026-11-24 · correções da review-002 · 02.2: sessão Claude nova grava `agent_version` a partir do `system/init` (`agentSdkInfoReporter.ts`), provado por `agentSdkSession.test.ts` pela `SessionHandlerFactory`; init sem versão não grava nada. Contrato do ID da pergunta reforçado em `questionAnswerValidation.test.ts`. Verificação (sem TEST_DATABASE_URL): `pnpm --dir packages/api test` 129 arquivos/804 testes; `pnpm --dir packages/api test:integration` 157 arquivos/770 testes, 5 skipped; `pnpm --dir apps/web test` 101 arquivos/520 testes; typecheck da API e da web e `pnpm lint` com exit 0.
