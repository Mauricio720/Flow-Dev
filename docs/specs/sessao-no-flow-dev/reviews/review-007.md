# Revisão de conformidade 007: A sessão do Claude dentro do Flow Dev

> **Data:** 2026-11-23 · **Escopo:** feature inteira (gate final), tarefas 01–07, incluindo as correções não commitadas da review-005 · **Intervalo:** `1145d68..e88ea67` + árvore de trabalho atual
> **Spec:** `spec.md` (com as edições não commitadas), `_tasks.md`, `task_01.md`–`task_07.md`, `v20-spike.md`, `latency-report.md`
> **Regras lidas:** AGENTS.md/CLAUDE.md da raiz, `apps/web/AGENTS.md`, RTK.md, `.claude/rules/code-standards.md`, `.claude/rules/e2e-testing.md`, skills `layered-backend`, `trpc-nextjs`, `nextjs-folder-structure` e `software-testing`
> **Prontidão:** `tasks_status.py` → 7 tarefas `completed`, 26/26 mini-tarefas, validação OK. A dispensa de V-30a/b, V-32g e V-31 manual pela UI, registrada em `task_07.md`, foi preservada.

## Veredito: REPROVADO

As correções da review-005 (B-1 a B-4 e I-1) se sustentam nos caminhos que elas cobrem. A classe de defeito do B-3 ("encerramento gravado antes do claim") continua aberta no claim de **abertura**. Com Encerrar confirmado numa sessão "Abrindo" ou "Não confirmada", o worker inicia o Claude com o prompt e só depois encerra. Também reproduzi uma flag de interrupção que sobrevive e corta a retomada. Todas as suítes e gates passam; os dois defeitos escapam a elas.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 1 | 1 | 3 | 2 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `python3 -I .claude/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/sessao-no-flow-dev` | 7 completed · 26/26 · validação OK | ✅ |
| `scan_diff.py --repo . --worktree --max-lines 100` | 60 arquivos; sem dependência nova; asserções "removidas" em 3 testes conferidas como troca de assinatura dos helpers (objeto no lugar de 4 parâmetros), sem enfraquecimento | — |
| `scan_diff.py --repo . --base 1145d68 --head HEAD --max-lines 100` | só `@anthropic-ai/claude-agent-sdk` 0.3.330 fixado (DEC-15); 4 `test.fixme` dispensados; `sk-teste` fictício em teste; runtime roteirizado condicionado a `NODE_ENV=test` (`terminalPorts.ts:12`, `scriptedSessionSteps.ts:28`); `schema.ts` 130 linhas | — |
| Medição por AST (TypeScript) dos 231 arquivos TS/TSX adicionados ou alterados | nenhuma função nova acima de 30 linhas ou 3 parâmetros, nem linha em branco dentro de função, fora de callbacks `describe`/`it`; excessos preexistentes em M-3 | ✅ |
| `pnpm --dir packages/api test` | exit 0 · 101 arquivos · 664 testes | ✅ |
| `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`) | exit 0 · 115 arquivos + 2 ignorados · 630 testes + 5 ignorados (Claude real, opt-in) · 67 s | ✅ |
| `pnpm --dir apps/web test` | exit 0 · 85 arquivos · 421 testes | ✅ |
| `pnpm typecheck` | exit 0 · API e web | ✅ |
| `pnpm lint` | exit 0 | ✅ |
| `pnpm build` | exit 0 · 17 páginas; 2 avisos de tracing de sistema de arquivos, já registrados nas reviews anteriores (arquivo fora da feature) | ✅ |
| `vitest run --config vitest.integration.config.ts test/session-latency.test.ts` | exit 0 · entrada p95 1.303 ms; texto→1ª timeline p95 1.436 ms; pergunta→1ª timeline p95 1.436 ms; resposta→runtime p95 810 ms | ✅ (ver M-2) |
| Experimento E1/E2: arquivo de teste temporário em `packages/api/test/`, apagado logo após a execução; Postgres descartável, worker e DAOs reais, runtime roteirizado | 3 cenários executados; resultados em B-1 e I-1 | ❌ comportamento |

Não executei Playwright (dispensado em `task_07.md`), o Claude real nem o smoke manual pela UI. Os 5 testes ignorados são os smokes opt-in com Claude real; não os apresento como aprovados.

## Conformidade com a spec

| Item | Status | Evidência |
|---|---|---|
| REQ-051, §16 Iniciar, §9 (prompt, anexos, skills) | ✅ | `terminalOpenSteps.ts:23-26` marca `prepared_at` só depois de contexto, anexos e prompt; `claimOpening` exige a marca (`drizzleSessionControlDao.ts:18`); `session-preparation-race.test.ts` com barreira e Postgres |
| REQ-052, REQ-053, US-06.4, US-08.1, §7.11, DEC-20 | ✅ | suítes de diálogo e `open` passam; opções do SDK em `agentSdkQueryOptions.test.ts` |
| REQ-054, REQ-081, REQ-082 | ✅ | `session-supervisor-start.test.ts`, `ExecutionStageSessions.test.tsx` |
| REQ-055, REQ-056, REQ-061, REQ-062, NFR-13, B-24, B-29 | ✅ | filtro de `parent_tool_use_id` em `agentSdkMessages.ts:10`; V-27a–f na integração |
| REQ-057, NFR-10 | ✅ com ressalva | o ensaio passa em duas execuções com fases diferentes (349 ms e 1.436 ms); o limite superior, persistência + ciclo de 1,5 s, fica abaixo de 3 s. Rede e renderização do navegador não medidas (declarado). M-2 |
| REQ-058–060, B-23, B-25 | ✅ | `session-send.test.ts`, `session-delivery.test.ts`, `session-resume.test.ts`, `SessionComposer.test.tsx` |
| REQ-063–066, §7.9, NFR-14 | ✅ | `QuestionRequestCard.tsx:16,26-27` isola `name`/`id` por `useId` + índice; `QuestionRequestCard.concurrent.test.tsx` falharia com o `name` pelo texto antigo (segundo rádio sem marca) |
| REQ-067, REQ-068, REQ-075 (resposta em sessão final) | ✅ | guarda sob `FOR UPDATE` em `drizzleSessionRequestDao.ts:22,39`; `session-interaction-dao.test.ts:40-59`. O teste de API correspondente é oco (M-1) |
| REQ-069–072, §7.10 | ✅ | summarizer, answerMapper, `session-requests`, `PermissionRequestCard` |
| REQ-073, B-30 (texto novo) | ✅ | `sessionControls.ts:40-41`, `sessionSignals.ts:14`, `SessionControls.tsx:25`; `session-controls-recovery.test.ts:45-70` nas duas ordens Stop/pergunta |
| **REQ-074, §7.2 (encerrar antes do início)** | 🔀 | Encerrar gravado antes do claim de abertura não impede `runtime.start`. **B-1** |
| REQ-076, REQ-078, REQ-079 | ✅ | recuperação de órfãs e V-26a–e passam |
| **REQ-077 (retomada entrega e continua)** | 🔀 | uma flag de interrupção presa corta a vez retomada. **I-1** |
| REQ-080, B-22, §7.4 | ✅ | `SessionControlAuthorization.requireOwnActive`; `canControl` em `sessionTimelineController.ts:50-53` |
| NFR-11, NFR-12, B-27, B-31 | ✅ | SDK só em `infra/terminal/`; `shell: false`; heartbeat e host nos claims |
| §7.5, §14, DEC-21, migrations 0048/0049 e rollbacks | ✅ | `session-preparation-migration.test.ts`; journal e `databaseMigrations.ts` registram a 0049 |
| §9, V-32a–f, REQ-014, `FLOW_DEV_TERMINAL_ENABLED`, agentes de planejamento | ✅ | suítes de regressão passam; `infra/agents/` sem mudança |
| DEC-15, DEC-16, DEC-19 | ✅ | SDK fixado em 0.3.330; `sessions:worker` e `dev` com `tsx` sem watch (`packages/api/package.json`) |
| V-30a/b, V-32g, V-31 pela UI | ⚪ dispensados | `task_07.md`, decisão do usuário; não contam como aprovados |
| Fora de escopo | ✅ | sem TTY, sem streaming palavra a palavra, sem troca de modo durante a sessão, sem avisos fora da tela |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| `.ts` até 100 linhas (`code-standards.md`, File Size) | 🟡 | nenhum arquivo novo acima; `schema.ts` já excedia (129) e a feature o levou a 130. M-3 |
| Funções até 30 linhas, até 3 parâmetros, sem linha em branco dentro (`code-standards.md`) | 🟡 | correções conformes (AST); `createTasksRouter` já excedia e foi de cerca de 32 para 34 linhas. M-3 |
| Sem comentários, sem números mágicos (`code-standards.md`) | ✅ | o scanner não acusa comentários adicionados; constantes nomeadas nos arquivos novos |
| Camadas: contratos em `application/`, SQL só em `infra/` (layered-backend, `_tasks.md`) | ✅ | `SessionRequestGate` em `application/services/terminal`; travas SQL nos DAOs de `infra/` |
| Fronteira tRPC (trpc-nextjs) | ✅ | procedures protegidas; erros novos em `taskErrors.ts` |
| Localização no front (nextjs-folder-structure) | ✅ | componentes e testes em `features/issues/assigned-work/` |
| Testes discriminantes (software-testing) | 🟡 | M-1 (teste oco); B-1 e I-1 sem cobertura |
| Sem aumento de timeout nem redução de workers (AGENTS.md) | ✅ | nenhuma mudança de configuração do vitest |
| Rules espelhadas `.agents/rules` = `.claude/rules` (AGENTS.md) | ✅ | sem alteração nesta feature |

## Achados

### B-1 (Bloqueante) · task_04/04.3 e task_05/05.2: Encerrar confirmado antes do claim de abertura não impede o início do Claude

- **Onde:** `packages/api/src/infra/database/dao/terminal/drizzleSessionControlDao.ts:18`, onde o candidato de `claimOpening` não confere `end_requested_at`: `and(eq(sessions.runtime, …), eq(sessions.hostId, …), inArray(sessions.status, CLAIMABLE_STATUSES), isNull(sessions.workerId), isNotNull(sessions.preparedAt))`.
  - `sessionWorkerComposition.ts:28-29` roda `OpeningStep` antes de `SessionControlsStep`.
  - `drizzleSessionStatusDao.ts:33` só lista, além do registry, sessões `interrupted` com end. Uma sessão `opening`/`unconfirmed` sem dono nunca tem o end processado sem ser assumida.
- **Alcance pela tela:** `sessionTimelineController.ts:50-53` dá `canControl` a quem abriu e é a operadora em qualquer estado ativo, e `SessionControls.tsx:26` mostra Encerrar sempre.
- **Contra:** REQ-074 ("o sistema DEVE parar o Claude… e levar a sessão a Encerrada") e §7.2 ("qualquer estado não final → Encerrada: a pessoa encerrou"). É a mesma classe do B-3 da review-005, cuja correção ficou só em `claimResume` (`drizzleSessionStatusDao.ts:50`).
- **Reprodução (E1):** sessão aberta e preparada, `session.end` aceito antes de qualquer tick. Depois, um ciclo do worker. A sessão termina `ended`, mas com `runtime.start` chamado:
  - `opening`: `{"before":{"status":"opening","end":true,"prepared":true},"startsAfterFirst":1,"afterFirst":{"status":"ended"}}`;
  - `unconfirmed`: `{"before":{"status":"unconfirmed","end":true,"prepared":true},"startsAfterFirst":1,"afterFirst":{"status":"ended"}}`.
- **Fluxo natural que leva a isso:**
  1. O serviço está parado, e a sessão vai a "Não confirmada" com "Confira se o serviço de sessões está rodando." (REQ-081).
  2. A pessoa aciona Encerrar e confirma. A sessão continua "Não confirmada".
  3. Ela sobe o `pnpm dev`. O serviço assume essa sessão e inicia o Claude Code com o prompt, por padrão em "Tudo liberado", e só depois fecha.
- **Por que os testes passam:** `session-controls-recovery.test.ts:72-88` cobre só o claim de retomada; nenhum teste grava end antes do claim de abertura.
- **Correção esperada:**
  - Um end persistido antes do claim nunca leva a `runtime.start`: o claim de abertura respeita atomicamente `end_requested_at`, como o de retomada.
  - A sessão vai a `ended` com a flag limpa no ciclo seguinte do serviço do mesmo host, sem iniciar o runtime.
  - Os casos normais de abertura (V-24a/b) se mantêm.
  - Sobre o que a tela mostra enquanto o serviço está fora, ver "Spec a discutir" 2.

### I-1 (Importante) · task_05/05.2–05.3: interrupção aceita sem vez ativa fica gravada e corta a próxima retomada

- **Onde:**
  - `drizzleSessionControlDao.ts:43-46`: `markRequested` aceita interromper em qualquer estado não final, inclusive `interrupted`, `opening` e `unconfirmed`, que não têm handle.
  - `drizzleSessionStatusDao.ts:33`: `controlRequests` não lista o interrupt de uma sessão `interrupted`.
  - `markOrphans` (`drizzleSessionControlDao.ts:37-41`) e `claimResume` (`drizzleSessionStatusDao.ts:50`) não limpam a flag.
  - Com a flag presa, `insertRequest` recusa qualquer pedido (`drizzleSessionRequestDao.ts:22`) e `answerIfPending` recusa respostas (`:39`).
- **Contra:**
  - REQ-077: a mensagem retoma a conversa e o Claude continua.
  - B-30: interromper sem vez ativa nem pedido pendente "não muda nada".
  - REQ-068.
- **Reprodução (E2):**
  1. Sessão `interrupted` com `claude_session_id`; `session.interrupt` é aceito.
  2. A pessoa envia "Pode seguir"; o worker novo retoma.
  3. Resultado: `{"accepted":"yes","resumes":1,"afterResume":{"status":"running","interrupt":true},"afterNext":{"status":"waiting","interrupt":false},"interrupts":1,"notes":["Interrompido por você"]}`.
  4. A vez retomada é interrompida no ciclo seguinte, com uma nota que a pessoa não pediu para essa vez. Até esse ciclo, um pedido do Claude seria negado com "Não foi possível registrar o pedido.".
- **Alcance:** a tela não mostra Interromper em `interrupted` sem pedido. O caso ocorre na corrida entre o clique em Interromper e a queda do serviço ou do processo do Claude antes do tick (≤ 1 s), ou numa chamada direta à API. Por ser uma corrida estreita, a severidade é Importante, e não Bloqueante.
- **Correção esperada:**
  - Um interrupt que não encontra vez ativa não sobrevive para uma vez futura: é recusado ou ignorado nos estados sem handle, ou é limpo na recuperação de órfãs e no claim de retomada, de forma atômica.
  - Regressão com a sequência E2: a vez retomada não é interrompida, e um pedido aberto nela é registrado.

### M-1 (Menor) · task_03/03.3: `session-request-final.test.ts` passa sem a checagem que diz provar

- **Onde:** `packages/api/test/session-request-final.test.ts:11,21`. A pergunta é `"Qual?"`, a resposta usa a chave `Qual`, e o teste só confere `.rejects.toThrow()`.
- **Contraexemplo:** sem a guarda `session_not_active` do controller (`sessionRequestController.ts:41`) e sem a guarda do DAO, a chamada ainda é recusada, com `answer_incomplete` (`questionAnswerValidation.ts:23`). O teste continua verde.
- **Comportamento que escapa:** a recusa por sessão final no controller não está provada por nenhum teste; a do DAO está (`session-interaction-dao.test.ts:40-46`). Por isso Menor.
- **Correção mínima:** usar a chave `"Qual?"` e afirmar `reason: "session_not_active"`, mantendo a verificação de que o pedido continua `pending`.

### M-2 (Menor) · task_07/07.2: o p95 do "primeiro polling" depende da fase e não representa a espera de quem vê a tela

- **Onde:**
  - `packages/api/test/session-latency-support.ts:26-39`: as 20 observações começam juntas e consultam a cada 1.500 ms, sempre na mesma fase.
  - `latency-report.md:13-21` apresenta 315/349 ms como p95.
- **Evidência:** na minha execução, as mesmas trajetórias deram 1.401/1.436 ms. A meta de 3 s se mantém pelo limite: persistência observada ≤ 332 ms, mais o ciclo de 1,5 s, mais a consulta, dá cerca de 1,9 s.
- **Correção mínima:** no relatório, declarar o limite superior (persistência + intervalo) como o número que vale para a REQ-057, ou defasar as observações. Explicar que o p95 medido depende da fase.

### M-3 (Menor): excessos de tamanho que já existiam cresceram

- **Onde:**
  - `packages/api/src/infra/database/schema.ts`: 129 → 130 linhas (limite 100).
  - `packages/api/src/routers/tasks.ts:22` `createTasksRouter`: de cerca de 32 para 34 linhas (limite 30).
- **Contra:** `code-standards.md` (File Size; Function and Method Size).
- **Correção mínima:** extrair o router `session` e a fábrica de controllers para fora de `createTasksRouter`, ou ao menos não aumentar. Opcional se o usuário aceitar a dívida preexistente.

## Atualizações de spec a discutir

1. **REQ-073 e B-30 foram reescritos pelo implementador** (não commitado: "Se Stop chegar enquanto um pedido ainda estiver pendente, Interromper continua disponível…"). O texto segue o que a review-005 pediu, e o código e os testes estão alinhados a ele. Confirme que aceita como contrato. Consequência a registrar: com Stop depois da pergunta, a etapa mostra "Aguardando você" com uma pergunta pendente, e não "Precisa de você" (US-07.1).
2. **Encerrar com o serviço fora do ar.** A §16 diz que `end` só grava `end_requested_at`. Uma sessão que nenhum serviço assumiu continua "Não confirmada" depois de a pessoa confirmar Encerrar, até o serviço voltar. Decidir uma de duas opções:
   - a web encerra direto uma sessão sem `worker_id`, de forma atômica;
   - a tela mostra o encerramento como pendente.

   Isso é independente de B-1: B-1 trata de o Claude iniciar; aqui a questão é o que a tela mostra enquanto ninguém processa.

## Divergências entre o relatório do implementador e a evidência

- review-006: "sem bloqueantes/importantes novos no delta" → B-1 é da mesma classe do B-3 corrigido, e I-1 foi agravado pelas guardas novas de `insertRequest`/`answerIfPending`; ambos reproduzidos.
- `task_05.md`, registro de 2026-11-23: "`claimResume` inclui `end_requested_at IS NULL`" → confirmado; o claim de abertura ficou de fora.
- `latency-report.md`: "p95 349 ms" → reproduzível como aprovação, mas o valor depende da fase (1.436 ms nesta rodada).
- `task_03.md`, B-1: verificação de banco em `session-interaction-dao.test.ts` → confirmado; o teste de API em `session-request-final.test.ts` é oco (M-1).
- 26/26 mini-tarefas e encerramento da 07 por decisão do usuário → confirmados estruturalmente; os E2E e o smoke pela UI continuam sem execução.

## Prompt de correção

> Corrija, nesta ordem, sem alterar nada fora do listado, preservando a dispensa de E2E/UI de `task_07.md`:
>
> 1. **B-1 · task_04/04.3 + task_05/05.2** em `packages/api/src/infra/database/dao/terminal/drizzleSessionControlDao.ts` (`claimOpening`) e no tratamento do end de sessões não assumidas:
>    - um `end_requested_at` gravado antes do claim de abertura nunca pode levar a `runtime.start`;
>    - a sessão `opening`/`unconfirmed` do host vai a `ended` com a flag limpa no ciclo seguinte do serviço;
>    - teste de integração com Postgres: `open` → `session.end` → ciclo do worker → `runtime.starts` vazio, `status = ended`, `endRequestedAt = null`, para `opening` e para `unconfirmed`;
>    - V-24a/b continuam passando.
> 2. **I-1 · task_05/05.2–05.3** em `drizzleSessionControlDao.ts` (`markRequested`/`markOrphans`) e/ou `drizzleSessionStatusDao.ts` (`claimResume`):
>    - um interrupt sem vez ativa não pode sobreviver até uma vez futura;
>    - teste de integração: sessão `interrupted` → `session.interrupt` → `send` → retomada → ciclo seguinte; a vez retomada não é interrompida, não há nota "Interrompido por você", e um pedido aberto nela é registrado;
>    - B-30 e V-25 continuam passando.
> 3. **M-1** em `packages/api/test/session-request-final.test.ts`: chave `"Qual?"` e `toMatchObject({ reason: "session_not_active" })`.
> 4. **M-2** em `docs/specs/sessao-no-flow-dev/latency-report.md` (e, se quiser, `session-latency-support.ts`): declarar o limite persistência + intervalo como número da REQ-057, e que o p95 do primeiro polling depende da fase.
> 5. **M-3 (opcional):** não aumentar `schema.ts` nem `createTasksRouter`; se possível, extrair o router `session`.
>
> Restrições: skills `layered-backend`, `trpc-nextjs`, `software-testing`; `.ts` até 100 linhas; funções até 30 linhas e 3 parâmetros; sem comentários; sem dependências novas; sem sleeps de sincronização; não aumentar timeouts nem reduzir workers.
>
> Ao terminar, rode e mostre a saída de:
> - `pnpm --dir packages/api test`;
> - `pnpm --dir packages/api test:integration`, sem `TEST_DATABASE_URL`;
> - `pnpm --dir apps/web test`;
> - `pnpm typecheck`;
> - `pnpm lint`.
>
> Não marque como concluído sem essa saída, e peça uma nova revisão final integral.
