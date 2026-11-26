# Revisão de conformidade 001: Trocar para execução direta depois das perguntas da spec

> **Data:** 2026-11-25 · **Escopo:** feature inteira (tasks 01 a 07, revisão final) · **Intervalo:** mudanças não commitadas sobre `HEAD` (`8de2ae2`), filtradas para os arquivos desta feature
> **Spec:** `docs/specs/troca-para-execucao-direta/spec.md`, `_tasks.md`, `task_01.md` a `task_07.md`
> **Regras lidas:** `CLAUDE.md` → `AGENTS.md`, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md`, `.agents/rules/e2e-testing.md`, skills `layered-backend`, `trpc-nextjs`, `nextjs-folder-structure`, `e2e-environment` e `software-testing`

> **Nota de escopo:** o worktree tem mudanças não commitadas de outras frentes: ambiente e2e, GitHub falso, captura de artefatos, skills e `githubIssueDeletionGateway.ts` com 137 linhas. Elas ficaram fora desta revisão. O arquivo não versionado `packages/api/.preflight.tmp.ts` (de 2026-11-24, com `console.log`) também não é desta feature, mas não deve entrar em commit.

## Veredito: APROVADO COM RESSALVAS

Todos os REQ, RN, NFR e casos de borda estão implementados e têm teste real. As suítes, o typecheck, o lint e o e2e V-09a passaram nesta sessão. Sobram cinco achados menores: um caminho de erro sem tratamento quando duas sessões confirmam trocas da mesma decisão, três arquivos de teste acima de 100 linhas, a metade de "replan" da V-07f trocada por um delete, textos e tipos soltos, e o log de decisão repetido no replay. Há ainda três atualizações de spec a discutir.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 0 | 0 | 5 | 3 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm --dir packages/api test` | exit 0 · 141 arquivos, 892 testes passaram | ✅ |
| `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`) | exit 0 · 190 arquivos passaram, 2 ignorados · 878 testes passaram, 5 ignorados | ✅ |
| `pnpm --dir apps/web test` | exit 0 · 116 arquivos, 640 testes passaram | ✅ |
| `pnpm typecheck` (raiz) | exit 0 | ✅ |
| `pnpm lint` (raiz) | exit 0 | ✅ |
| `pnpm --dir apps/web e2e:prepare` | exit 0 · banco `flow_dev_e2e` recriado e migrado | ✅ |
| `pnpm --dir apps/web exec playwright test e2e/route-switch.spec.ts` | exit 0 · 1 passed (V-09a); worker logou `delivered count=1` | ✅ |
| Banco dev: `to_regclass('task_route_switches')` e `__drizzle_migrations` | tabela existe; 55 migrations; última `created_at = 1795711364372` = `when` da 0055 no journal | ✅ |
| `scan_diff.py --worktree --max-lines 100` | 3 arquivos longos desta feature (confirmados, M-2); `placeholder` e `debug-leftover` só em arquivos fora da feature | — |

O smoke manual V-09b/V-09c (Claude e Codex reais) não foi refeito aqui. A evidência é o registro da 07.2, e os relatórios em `/tmp/route-switch-smoke/` não são versionados.

## Conformidade com a spec

| Item | Status | Evidência |
|---|---|---|
| REQ-001 | ✅ | Parágrafo em `SPEC_INSTRUCTION` (`terminalPromptCopy.ts:8-16`), com a régua, o "aguarde a resposta do Flow Dev" e o bloco; aceite em `routeSwitchRules.ts:26-32`; V-02a, V-02f, V-03a |
| REQ-002 | ✅ | `RouteSwitchCard.tsx:20-33`; V-08a; e2e V-09a |
| REQ-003 | ✅ | `sessionTimelineMerge.ts:19` (`parseRouteSwitchBlock(...).text` para `assistant`); V-07h, V-01a, V-01h; e2e confere que a cerca não aparece |
| REQ-004 | ✅ | `routeSwitchDecision.ts:14-17` grava status, quem e quando; V-05a confere origem, nova rota, resumo e motivos |
| REQ-005 | ✅ | `ROUTE_SWITCH_CONFIRMED_MESSAGE` (`terminalPromptCopy.ts:26`), com o texto literal da §15; V-05a; e2e |
| REQ-006 | ✅ | `ROUTE_SWITCH_DECLINED_MESSAGE` literal; V-05b |
| REQ-007 | ✅ | `routeSwitchRules.ts:22-24,30`; V-02g, V-04c (relógio fixo, 10:00 → 10:05) |
| REQ-008 | ✅ | V-04c (resposta às 10:03 → `proposed`) |
| REQ-009 | ✅ | `routeSwitchService.ts:24-25`; mensagens literais em `terminalPromptCopy.ts:30-39`; V-04a, V-04b, V-04d |
| REQ-010 | ✅ | `onConflictDoNothing` no índice parcial (`routeSwitchReads.ts:38-42`) e `ignore` com pendente; V-03b, V-02d |
| REQ-011 | ✅ | `requireOwnActive` antes de ler a proposta (`routeSwitchController.ts:16`); V-06a pelo router |
| REQ-012 | ✅ | `routeSwitchDecision.ts:20-24`, replay pela chave; `CONFLICT` "Essa proposta já foi decidida." (`sessionErrorCatalog.ts`); V-06b, V-06c, V-06e; tela V-08g |
| REQ-013 | ✅ | `routeSwitchState` (`routeSwitchRules.ts:34-36`); V-02i, V-07i, V-06d; tela V-08e; a tela recarrega tudo quando a sessão termina (`sessionTimelineModel.ts:38-41`) |
| REQ-014 | ✅ | `workProgressReads.ts:8-9` com `effectiveRoute`; V-07a/b/c; e2e confere o chip |
| REQ-015 | ✅ | `PlanningRouteSwitchRecord.tsx`, `switchedRecord` (`routeSwitchCopy.ts:31-33`); V-08i; DTO V-07f (rótulos: veja S-2) |
| REQ-016 | ✅ | `drizzleTerminalExecutionDao.ts:20-22` e `routeTrail`; V-07g, V-08j |
| REQ-017 | ✅ | `terminalPromptSource.ts:41-44` e `terminalPromptBuilder.ts:42-43`; V-07d abre pela API real e confere `route = 'direct_execution'` e a linha do prompt |
| REQ-018 / B-04 | ✅ | `effectiveRoute` por decisão; V-02k e V-07e (replan real pela API e pelo worker). Para o chip e o Planejamento, o teste não distingue "decisão vigente" de "qualquer decisão" (M-3) |
| RN-01 | ✅ | Régua no prompt; V-03e confere "nada de O QUÊ em aberto" |
| RN-02 | ✅ | `evaluateProposal`; cada condição em V-02a a V-02e; P-01 com `spec_exists` |
| RN-03 | ✅ | Índices parciais na 0055; V-10c; "expirada" calculada |
| RN-04 | ✅ | V-02g, V-02h, V-04c |
| RN-05 | ✅ | `effectiveRoute`, usado nos três leitores (prompt, chip, Planejamento) |
| RN-06 | ✅ | `SessionControlAuthorization.requireOwn` (dona + `requireOperate`) |
| NFR-01 | ✅ | Update e mensagem na mesma transação (`routeSwitchDecision.ts:31-37`); V-05d confere o rollback; cursor por `decidedAt ?? proposedAt`, V-07j |
| NFR-02 | ✅ | Detector só em `SessionRecorder.text` (`sessionRecorder.ts:20-41`); V-03c (subagente), V-03d (operadora) |
| NFR-03 | ✅ | `disabled` + `aria-busy` (V-08f); região `aria-live="polite"` da conversa (V-08h); nomes iguais ao texto |
| NFR-04 | ✅ | Parser e checks no banco; V-01d, V-01e, V-01g, V-10c |
| B-01 | ✅ | V-05c (sessão `interrupted`, mensagem enfileirada) |
| B-02 | ✅ | V-06b (`Promise.all` no Postgres real) |
| B-03 | ✅ | Sem o parágrafo, a IA não emite o bloco; V-03e confere que a rota direta não tem o parágrafo |
| B-05 | ✅ | Sem código, como a spec define |
| B-06 | ✅ | `deletionPurge.ts:8`; V-10b |
| B-07 | ✅ | V-03c, V-03d |
| §9 Não muda | ✅ | Suítes `planning-*`, `session-*` e `issue-deletion-*` verdes; os únicos testes antigos alterados ganharam casos novos ou o campo `routeSwitch: null`/`switchedFrom` (`planningDtoMapper.test.ts`). Nenhuma asserção foi afrouxada; o trigger de imutabilidade não foi tocado |
| §19 Logs | ✅ | `route_switch_proposed`, `route_switch_discarded`, `route_switch_decided` e `route_switch_detect_failed`, com asserção nos campos (V-03a, V-04a, V-05a, V-03f). Replay: M-5 |
| §20 Migration | ✅ | `0055_route_switches.sql` + rollback, `_journal.json`, `databaseMigrations.ts`; V-10c; aplicada no dev |
| DEC-01 | ✅ | Bloco + cartão próprio |
| DEC-02 | ✅ | Tabela própria; `task_planning_decisions` intocada |
| DEC-03 | ✅ | `spec-writer/SKILL.md` sem relação com a troca; formato definido ao lado do parser |
| DEC-04 | ✅ | `DrizzleSessionMessageDao.insertUserMessage` dentro da transação; entrega pelos passos existentes (e2e: `delivered count=1`) |
| P-02 | ✅ | Smoke registrado na 07.2 e na spec §11 (não refeito nesta revisão) |
| Fora de escopo | ✅ | Não há desfazer, troca inversa, troca PRD→Tech Spec, mudança na régua do planejamento nem sessão nova. Nenhuma dependência nova |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| Sem comentários (`code-standards.md` › Comments) | ✅ | O scanner não achou comentário adicionado nos arquivos da feature |
| `.ts` com no máximo 100 linhas (`code-standards.md` › File Size) | 🟡 | Código de produção dentro do limite (maior: `terminalSessionDao.ts`, 96). Testes acima: M-2 |
| Funções com no máximo 30 linhas | ✅ | Maior caso: o corpo do `it` da V-07d, com 30 linhas |
| Até 3 parâmetros | ✅ | Objetos de parâmetro (`DecideInput`, `ProposeInput`, `InsertPendingInput`) |
| Sem linha em branco dentro de função | ✅ | As linhas em branco estão só entre membros de classe |
| Constantes para números e textos | 🟡 | Limites e textos de tela extraídos. Sobram `"waiting"` e `"confirmed"` soltos: M-4 |
| Segredos fora do código | ✅ | O e2e usa a `seed`/`.env.e2e`; não há credenciais |
| `layered-backend`: contrato em `application/`, implementação em `infra/`, controller fino | ✅ | `routeSwitchDao.ts` em `application/database/dao/`, Drizzle em `infra/database/dao/terminal/`; o controller só autoriza, confere o escopo e delega |
| `trpc-nextjs`: Zod `.strict()`, erros por `TaskError` → catálogo | ✅ | `sessionDecideRouteSwitchInputSchema`; `route_switch_decided` → `CONFLICT`, `route_switch_not_found` → `NOT_FOUND` |
| `nextjs-folder-structure`: componente, hook e copy na feature | ✅ | `components/RouteSwitchCard.tsx`, `hooks/useRouteSwitchDecision.ts`, `routeSwitchCopy.ts`; o cliente tRPC fica em `sessionClient.ts` |
| Autorização no servidor (não só na tela) | ✅ | `requireOwnActive` no controller; a escrita confere `session_id` (`routeSwitchDecision.ts:15`) |
| Relógio injetado (restrição global do `_tasks.md`) | ✅ | `now` em serviço, controller e testes; nenhum `Date.now()` nas regras |
| E2E: locators acessíveis, sem credenciais no arquivo (`e2e-testing.md`) | ✅ | `getByRole`, `getByLabel`, `getByText`; `seed.operator()` |
| Sem commit/push/PR sem pedido | ✅ | Nada commitado |

## Achados

### task_04 · 04.1

#### M-1 (Menor) — Confirmar uma segunda troca da mesma decisão termina num erro de banco sem tratamento (inferido)
- **Onde:** `packages/api/src/infra/database/dao/terminal/routeSwitchDecision.ts:14-17`, em `updatePending`: o `update … set status = 'confirmed'` não trata a violação de `task_route_switches_decision_confirmed_unique`.
- **Contra:** RN-03 ("cada decisão de planejamento tem no máximo uma troca confirmada") e REQ-012 (o erro deve ser de domínio, e a tela deve mostrar o estado atual).
- **Problema:** a mesma pessoa pode ter duas sessões de rota ativas no mesmo trabalho (`allowAdditional`; o teste `B-31` de `session-recorder.test.ts:86` usa esse cenário). Se as duas propuserem antes de qualquer decisão, elas ficam com duas pendentes, e o próprio V-06f monta esse estado. Confirmada a primeira, confirmar a segunda viola o índice único. O erro sai do Postgres (23505), passa por `mapTerminalError` como erro inesperado, e a tela mostra a mensagem genérica com o cartão ainda pendente e com botões. O banco protege o invariante, e nenhum dado se corrompe. Isso foi inferido da leitura do código; não rodei o cenário.
- **Correção esperada:** dentro da transação, a violação desse índice vira um resultado de domínio, por exemplo `TaskError("route_switch_decided")` ou um motivo novo que a spec defina (S-1), sem gravar mensagem. Falta um teste de integração com duas sessões, duas pendentes e duas confirmações.

### task_03 · 03.2 / task_05 · 05.4

#### M-2 (Menor) — Três arquivos de teste passaram de 100 linhas com esta feature
- **Onde:**
  - `packages/api/test/session-recorder.test.ts`: 97 → 122 linhas (V-03c, V-03d, V-03f);
  - `packages/api/test/issue-deletion-terminal.test.ts`: 93 → 112 (V-10b);
  - `apps/web/src/features/issues/assigned-work/components/SessionConversation.test.tsx`: 71 → 112 (V-08g, V-08h).
- **Contra:** `.agents/rules/code-standards.md` › File Size ("Never create classes or `.ts` files with more than 100 lines").
- **Problema:** a regra não abre exceção para testes. O repositório já tem testes acima do limite (`planning-reads.test.ts`, 178), mas estes três passaram do limite por causa desta feature.
- **Correção esperada:** levar os casos novos para arquivos próprios: `test/route-switch-recorder.test.ts`, `test/issue-deletion-route-switch.test.ts` e `SessionConversationRouteSwitch.test.tsx`. Os originais voltam a ter até 100 linhas, e nenhuma asserção muda.

### task_05 · 05.2

#### M-3 (Menor) — A V-07f não faz o replan pedido, e o teste do chip e do Planejamento não prova a "decisão vigente"
- **Onde:** `packages/api/test/route-switch-effective-reads.test.ts`, no final do caso: em vez de um replan, ele apaga a linha `confirmed` e confere `route: "prd"` e `routeSwitch: null`.
- **Contra:** V-07f em `task_05.md` ("Depois do replan → `routeSwitch: null`"), REQ-018 e B-04.
- **Problema:** contraexemplo: se `readRoutes` ou `readPlanningProjection` buscassem "qualquer troca confirmada da tarefa" em vez da troca da decisão vigente, o teste continuaria passando. Apagar a linha zera as duas versões. O código atual está certo pela leitura: o join é por `planning_decision_id` (`workProgressReads.ts:8`, `planningProjection.ts:20`). A regra pura (V-02k) e o prompt (V-07e) estão provados; o chip e o Planejamento depois do replan, não.
- **Correção esperada:** no mesmo teste, ou num novo, aprovar uma decisão D2 depois da troca da D1, como faz `route-switch-effective-prompt.test.ts`, ou inserir D2 aprovada e apontar `tasks.planning_decision_id` para ela. Depois, conferir `readProgress(...).route` = rota da D2 e `planning.routeSwitch` = `null`, com a linha confirmada da D1 ainda no banco.

### task_02 · 02.2 / task_05 · 05.2–05.3

#### M-4 (Menor) — Textos e tipos soltos nos leitores
- **Onde:**
  - `routeSwitchService.ts:32` e `planningProjection.ts:21`: `toRouteSwitchView(record, "waiting")`, um status de sessão inventado e sem nome;
  - `workProgressReads.ts:8` e `drizzleTerminalExecutionDao.ts:20`: `"confirmed"` literal, enquanto `routeSwitchReads.ts` já tem a constante `CONFIRMED`;
  - `workProgressReads.ts:9`: `row.route as "prd" | "tech_spec"`, falso para decisões `direct_execution` (inofensivo hoje, porque `effectiveRoute` devolve a rota como veio);
  - `sessionTimelineQueries.ts:22`: `row!` e um tipo por `import("…")` inline;
  - `drizzleTerminalExecutionDao.ts:19-22`: `decisionId` selecionado e descartado.
- **Contra:** `code-standards.md` › Magic Numbers and Strings; clareza.
- **Correção esperada:**
  - uma constante exportada para o status `confirmed`, usada nos três leitores;
  - uma função `toDecidedRouteSwitchView(record)` ou uma constante nomeada no lugar do `"waiting"`;
  - o cast correto `as PlanningRoute`;
  - o `TerminalSessionStatus` importado no topo;
  - tirar o `decisionId` que não é usado.

### task_04 · 04.1

#### M-5 (Menor) — `route_switch_decided` é logado de novo no replay
- **Onde:** `packages/api/src/controllers/routeSwitchController.ts:20`: o log roda depois de qualquer retorno de `service.decide`, inclusive no `replayed`.
- **Contra:** §19 ("dá para medir quantas sessões de PRD viram execução direta").
- **Problema:** um retry da mesma decisão (V-08g reaproveita a chave) produz dois logs `route_switch_decided` para uma única decisão, o que infla a métrica.
- **Correção esperada:** logar só quando o DAO devolver `decided`. Para isso, o serviço precisa expor o `outcome`, ou o próprio serviço loga. Falta um teste: um replay não gera um segundo log.

## Atualizações de spec a discutir
- **S-1 (troca concorrente entre sessões):** a spec não diz o que acontece com as outras pendentes da mesma decisão quando uma é confirmada, nem qual erro recebe quem confirma a segunda (M-1). Proposta: tratar como "Essa proposta já foi decidida." ou criar "este trabalho já foi trocado", e marcar as outras pendentes como expiradas na leitura.
- **S-2 (a spec não registrou o que mudou na implementação, §24):**
  - §15 escreve `{ kind: "route_switch", … }`, mas a timeline usa `type` (decisão da task 05);
  - REQ-015 e US-03 cen. 1 citam "Rota recomendada/Rota aprovada", mas a tela mantém "Recomendação original/Rota salva" (confirmado pelo usuário em 2026-11-25);
  - PT-04 (a linha termina com "· Complexidade: X") só aparece no `_tasks.md`;
  - o roteiro do e2e perdeu o `wait_message` depois do `ask`.

  A Definição de pronto pede que a spec reflita o que mudou.
- **S-3 (chip durante um replan em revisão):** `readRoutes` usa a decisão mais recente por `created_at`, sem filtrar por status. Esse comportamento já existia. Enquanto uma D2 está em revisão, o chip mostra a rota dela e esconde a troca da D1, embora `readApprovedPlanning` continue usando a D1. A spec chama a D1 de "decisão vigente". Vale decidir se o chip deve seguir `tasks.planning_decision_id`.

## Divergências entre o relatório do implementador e a evidência
- Nenhuma relevante. As contagens e os resultados dos registros de execução batem com o que rodei: a API cresceu de 888 para 892 testes por causa das outras frentes, e o web segue com 640. O e2e V-09a passou de novo, e a 0055 está aplicada no dev.
- Nota de forma: nas tasks 01 a 05, os checkboxes de "Testes atribuídos" ficaram `[ ]`, mas todos os testes existem e passam. Os das tasks 06 e 07 estão `[x]`.

## Prompt de correção

> Corrija, nesta ordem, sem alterar nada fora do listado:
> 1. **M-1** (task_04 · 04.1): em `packages/api/src/infra/database/dao/terminal/routeSwitchDecision.ts`, trate a violação de `task_route_switches_decision_confirmed_unique` dentro da transação. O resultado deve ser de domínio (`already_decided` → `TaskError("route_switch_decided")`, ou o motivo que a spec definir em S-1), sem gravar mensagem e com a proposta ainda `pending`. Teste novo de integração: duas sessões de rota da mesma decisão, cada uma com uma pendente. Confirmar a primeira dá `decided`; confirmar a segunda dá o erro de domínio (`CONFLICT`), e só existe uma mensagem nova.
> 2. **M-3** (task_05 · 05.2): em `packages/api/test/route-switch-effective-reads.test.ts`, troque o delete da linha confirmada por uma decisão D2 aprovada e vigente, com a troca confirmada da D1 ainda no banco. Confira `readProgress(...).route` = rota da D2 e `planning.routeSwitch` = `null`.
> 3. **M-5** (task_04 · 04.1): logue `route_switch_decided` só quando o DAO devolver `decided`, não no `replayed`. Teste: um replay com a mesma `requestKey` não gera um segundo log.
> 4. **M-4** (task_02/05): crie uma constante para o status `confirmed` e use em `workProgressReads.ts` e `drizzleTerminalExecutionDao.ts`. Troque o `"waiting"` de `routeSwitchService.ts:32` e `planningProjection.ts:21` por uma função ou constante com nome. Corrija o cast em `workProgressReads.ts:9` para `PlanningRoute`, importe `TerminalSessionStatus` no topo de `sessionTimelineQueries.ts` e tire o `decisionId` que não é usado em `drizzleTerminalExecutionDao.ts`.
> 5. **M-2**: leve os casos novos para arquivos próprios (`test/route-switch-recorder.test.ts`, `test/issue-deletion-route-switch.test.ts`, `SessionConversationRouteSwitch.test.tsx`), sem mudar as asserções, para os três arquivos voltarem a ter até 100 linhas.
> 6. **S-2**: atualize a `spec.md` (§15 `type`, os rótulos do REQ-015 e da US-03, PT-04 e o roteiro do e2e) e registre no Histórico. Não mude IDs.
>
> Restrições: `.agents/rules/code-standards.md` (sem comentários, `.ts` ≤ 100 linhas, funções ≤ 30, ≤ 3 parâmetros, sem linha em branco dentro de função, constantes nomeadas). Não use `Date.now()`. Sem dependências novas, e sem commit, push ou PR.
> Ao terminar, rode e mostre a saída de: `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`), `pnpm --dir apps/web test`, `pnpm typecheck` e `pnpm lint`. Não marque nada como concluído sem essa saída.
