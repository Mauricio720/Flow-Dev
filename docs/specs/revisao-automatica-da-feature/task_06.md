---
status: completed
title: "Passo do ciclo: falhas, paradas e retomada"
type: backend
complexity: critical
---

# Task 06: Passo do ciclo: falhas, paradas e retomada

## Visão geral
Completa o `ReviewCycleStep` com tudo o que tira o ciclo do caminho principal: Parar, etapa não atualizada, Tentar de novo, sessão que não abre, cai ou é encerrada, sessão substituta, perda de posse, planejamento refeito, conjunto ilegível, turno fora da vez, reinício do serviço e exclusão da Issue. É o freio do ciclo sem limite de rodadas e o que garante as duas sessões por ciclo mesmo depois de uma queda.

<critical>
- LEIA a spec (§7.1, §7.4 "Motivos", §8, §16 item 2.1–2.5, REQ-020–027, REQ-042–044) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use a skill `layered-backend`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`.claude/skills/software-testing/SKILL.md`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-022: o pedido `stop` DEVE encerrar as duas sessões e terminar em `stopped` com `ended_by`, sem desfazer o checkout. Em `failed`, "Encerrar revisão" é o mesmo `stop`.
- REQ-024 / B-01 / B-04: a sessão da vez termina o turno sem etapa válida para o papel → `failed` com o motivo de `readStage`.
- REQ-025: `retry` DEVE mandar de novo a última mensagem da etapa à mesma sessão, sem mudar a rodada.
- REQ-044: em `failed` por etapa não atualizada, uma etapa válida gravada pela sessão da vez num turno posterior DEVE seguir a transição dela.
- REQ-023 / B-06 / B-10: a sessão da vez não abre (`launch_failed` ou pré-condição), é interrompida durante a vez, já está `ended` quando a vez chega, ou recebe `interrupt_requested_at` depois de `step_started_at` → `failed`, com "A sessão foi interrompida ou encerrada antes de terminar a etapa." ou, se não abriu, a mensagem que ela registrou.
- REQ-043: em `retry` com a sessão do papel encerrada ou não aberta, DEVE abrir uma substituta com o prompt inicial do papel e o relatório atual, `attempt` + 1.
- REQ-026: a cada tick, posse perdida (claim não `claimed` ou operadora ≠ `started_by`), planejamento não aprovado ou conjunto ilegível → `stopped` com "Você não opera mais este trabalho.", "O planejamento não está mais aprovado." ou "O conjunto de tarefas não está legível.", e o fim das duas sessões.
- REQ-042 / B-11: o fim de turno da sessão que não é a da vez NÃO DEVE conduzir o ciclo.
- REQ-020 / REQ-021 / B-09: depois de reinício, os ciclos não finais desta máquina DEVEM ser retomados pelo estado guardado, sem segunda sessão do mesmo papel (a `request_key` derivada da 05 com a unicidade `(user_id, request_key)`).
- REQ-027: QUANDO a Issue for excluída, o ciclo e as duas sessões DEVEM terminar antes de os dados serem apagados; a exclusão DEVE apagar `task_review_cycles` e `task_review_rounds`.
- NFR-04: nenhuma tentativa automática: em `failed`, os ticks seguintes não mandam mensagem nem abrem sessão até um pedido ou uma gravação válida.
- B-07 / §9: sessões manuais do trabalho continuam abrindo com "Abrir outra?", e o ciclo as ignora.
- NFR-06: linha `[review] step_failed` com o motivo em cada falha; `cycle_finished` em cada parada.

## Interfaces
- **Consome:** `ReviewCycleStep`, `ReviewCycleWorkerDao`, `reviewRequestKeys.ts`, `reviewLog.ts` (05); `step_role` (01); `applyAction`, `applyStage`, `readStage`, prompts (02); `SessionLauncher`, `SystemMessageSender` (03); `WorkAuthorization`/consulta de claim; leitura do planejamento aprovado (`sessions.approvedPlanning`); leitor do conjunto (`taskSetLoader`); `CLEANUP_STEPS` de `infra/database/dao/issue-deletion/deletionPurge.ts` e a parada coordenada de sessões da exclusão (`issueDeletionComposition.ts`, `test/issue-deletion-terminal-support.ts`).
- **Produz:**
  - `reviewStepFailure.ts` (detecção de falha da sessão da vez), `reviewStepGuards.ts` (REQ-026), extensões de `reviewStepActions.ts` (`stop`, `retry`) em `application/services/review/`.
  - Os motivos de §7.4 "Motivos de parada" e "A sessão foi interrompida ou encerrada antes de terminar a etapa." em `reviewCopy.ts`.
  - `CLEANUP_STEPS` com `task_review_rounds` antes de `task_review_cycles`; a parada coordenada da exclusão termina os ciclos não finais do trabalho.

## Mini-tarefas

- [x] **06.1 — Parar, etapa não atualizada, Tentar de novo e destravar**
  - **Arquivos:** `packages/api/src/application/services/review/reviewStepActions.ts` (alterar), `reviewStepTurn.ts` (alterar), `reviewCopy.ts` (alterar), `packages/api/test/review-cycle-failures.test.ts` (criar)
  - **Testes:** V-06a, V-06b, V-06c
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-failures.test.ts` passa
- [x] **06.2 — Sessão da vez que não abre, cai ou é encerrada; substituta**
  - **Arquivos:** `reviewStepFailure.ts` (criar), `reviewStepOpen.ts` e `reviewCycleStep.ts` (alterar), `packages/api/test/review-cycle-sessions.test.ts` (criar)
  - **Testes:** V-06d, V-06e, V-06f, V-06g
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-sessions.test.ts test/review-cycle-failures.test.ts` passa
- [x] **06.3 — Posse, planejamento, conjunto e turno fora da vez**
  - **Arquivos:** `reviewStepGuards.ts` (criar), `reviewCycleStep.ts` (alterar), `packages/api/test/review-cycle-guards.test.ts` (criar)
  - **Testes:** V-06h, V-06i
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-guards.test.ts` passa
- [x] **06.4 — Reinício do serviço sem sessão duplicada**
  - **Arquivos:** `reviewStepOpen.ts` (alterar, se preciso), `packages/api/test/review-cycle-restart.test.ts` (criar)
  - **Testes:** V-06j, V-06k
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-restart.test.ts` passa
- [x] **06.5 — Exclusão da Issue e sessões manuais**
  - **Arquivos:** `packages/api/src/infra/database/dao/issue-deletion/deletionPurge.ts` e `deletionPurge.test.ts` (alterar), a parada coordenada da exclusão (alterar), `packages/api/test/review-cycle-deletion.test.ts` (criar)
  - **Testes:** V-06l, V-06m, V-13d, V-13e
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/database/dao/issue-deletion/deletionPurge.test.ts` e `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-deletion.test.ts test/issue-deletion-terminal.test.ts test/issue-deletion-purge.test.ts` passam; `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
- A detecção de falha (§16 item 2.4) olha só a sessão da vez: `launch_failed`; `interrupted` com `updated_at` depois de `step_started_at`; `ended` sem o motivo de fim do ciclo; `interrupt_requested_at > step_started_at`. A sessão que só aguarda pode estar `interrupted` (B-09) sem falha: ela volta pelo `SessionResumeStep` quando a mensagem dela chega.
- `retry` manda de novo a última mensagem com uma `requestKey` nova (inclua a `revision` do pedido), para não colidir com a mensagem original já entregue. Se a sessão do papel estiver `interrupted`, a mensagem a retoma com o histórico (`SessionResumeStep`); se estiver `ended` ou nunca abriu, abra a substituta com `attempt` + 1 e o prompt inicial do papel.
- REQ-044: em `failed` por etapa não atualizada, continue observando fim de turno da sessão da vez depois do `step_started_at` original; uma etapa válida segue `applyStage` a partir de `failed`.
- REQ-026 roda antes de tudo no tick (§16 item 2.1) e vale para todos os estados não finais, inclusive `caveats` e `failed`.
- Reinício: o passo não guarda estado em memória; todo o estado vem do banco. Simule a queda entre `SessionLauncher.launch` e `setSession` com uma falha injetada na `setSession` do DAO e recrie o serviço de sessões.

### Arquivos relevantes
- `packages/api/src/application/services/terminal/sessionResume.ts`, `orphanRecovery.ts`, `sessionControls.ts`: retomada, recuperação e fim.
- `packages/api/src/infra/database/dao/issue-deletion/deletionPurge.ts` e `.test.ts`: ordem de limpeza.
- `packages/api/test/issue-deletion-terminal.test.ts`, `issue-deletion-terminal-support.ts`: exclusão com sessões abertas.
- `packages/api/test/terminal-open-plan-item-again.test.ts`: "Abrir outra?" com sessão ativa.

### Arquivos afetados
- `deletionPurge.ts`: duas tabelas novas.
- O passo do ciclo (arquivos da 05).

### Decisões relacionadas
- DEC-01 (retomada natural depois de reinício), DEC-05 (a exclusão apaga duas tabelas a mais), DEC-08 (a sessão que cai volta com o histórico).

## Premissas
Nenhuma. O papel da vez em `failed` é `step_role` (01).

## Testes atribuídos
- [x] V-06a (US-04 cen. 1, REQ-022): ciclo em `executing` na rodada 3 e pedido `stop` → um tick deixa `stopped`, `ended_by` = operadora, as duas sessões `ended`, e um arquivo que a execução gravou continua no checkout com o mesmo conteúdo · passo + Postgres + runtime roteirizado.
- [x] V-06b (US-04 cen. 2–3, B-01, B-04, REQ-024, REQ-025, NFR-04): a revisão termina o turno sem gravar `etapa.md` → `failed` com `failure` = "A sessão de revisão terminou sem atualizar docs/specs/x/reviews/etapa.md."; cinco ticks depois, nenhuma mensagem nem sessão nova; pedido `retry` → a mesma sessão de revisão recebe de novo a mesma mensagem da rodada, `round` igual; a execução termina com uma pergunta escrita no texto, sem gravar → motivo da execução · idem.
- [x] V-06c (US-04 cen. 4, REQ-044, B-01): ciclo em `failed` por etapa não atualizada; a operadora responde na conversa da sessão de revisão, ela grava `execute` com relatório novo e termina o turno → o ciclo vai para `executing` e a execução recebe a mensagem, sem pedido `retry` · idem.
- [x] V-06d (B-06, REQ-023): o modelo da execução sai do catálogo antes de ela abrir → `failed` com a mensagem de modelo indisponível registrada pela abertura; `retry` repete a falha; `stop` → `stopped` · idem, catálogo falso.
- [x] V-06e (B-09, REQ-023, REQ-025): a sessão da vez (revisão) sofre `crash` → `failed` com "A sessão foi interrompida ou encerrada antes de terminar a etapa."; `retry` → a mesma sessão é retomada pelo `SessionResumeStep` com o `claudeSessionId` dela e recebe a mensagem; nenhuma sessão nova · serviço real + runtime roteirizado.
- [x] V-06f (B-09): a sessão de execução fica `interrupted` enquanto só aguarda; a revisão grava `execute` → a execução é retomada pela mensagem e o ciclo segue, sem falha · idem.
- [x] V-06g (REQ-043, B-10): a operadora encerra pela conversa a sessão de execução durante a vez dela → `failed`; `retry` → sessão `review_execute` nova com `attempt = 2`, `executeInitialPrompt` com o relatório atual, e o ciclo continua com 2 sessões ativas; a operadora só interrompe a revisão (`interrupt_requested_at`) → `failed`, e depois a sessão grava etapa válida → segue · idem.
- [x] V-06h (REQ-026): três casos, cada um com ciclo em `executing` → claim liberado → `stopped` com "Você não opera mais este trabalho."; planejamento refeito → "O planejamento não está mais aprovado."; `_tasks.md` ilegível → "O conjunto de tarefas não está legível."; em todos, as duas sessões `ended`; o mesmo vale em `caveats` · passo + Postgres.
- [x] V-06i (REQ-042, B-11): ciclo em `executing`; a operadora manda uma mensagem à sessão de revisão, que grava `etapa.md` com `aprovada` e termina o turno → o ciclo continua em `executing`, sem rodada nova; quando a execução grava `review`, a revisão recebe a continuação e a etapa seguinte vê o arquivo que a conversa mudou · idem.
- [x] V-06j (REQ-021, B-09): o serviço reinicia com o ciclo em `executing` e a execução em andamento → a sessão da vez fica `interrupted`, o ciclo vai para `failed`; `retry` no serviço novo a retoma com o histórico · serviço recriado + Postgres.
- [x] V-06k (REQ-020, Foco de revisão 2): falha injetada depois de `launch` e antes de `setSession` da revisão; serviço recriado → o tick encontra a sessão pela `request_key` derivada e a registra; o ciclo tem uma única sessão `review` · idem.
- [x] V-06l (REQ-027): Issue excluída com ciclo em `reviewing` e duas sessões vivas → as sessões terminam e o ciclo sai do estado não final antes de os dados serem apagados; depois, nenhuma linha em `task_review_cycles` nem `task_review_rounds` do trabalho · exclusão real + Postgres.
- [x] V-06m (NFR-06): cada falha das 06.1–06.3 gera `[review] step_failed` com `cycleId`, `round`, `role` e o motivo; cada parada gera `cycle_finished` · log capturado.
- [x] V-13d: `CLEANUP_STEPS` contém `task_review_rounds` antes de `task_review_cycles`, e ambos antes de `task_terminal_sessions` se a ordem exigir · teste unitário de ordem (`deletionPurge.test.ts`).
- [x] V-13e (B-07, §9): com ciclo em `reviewing`, a operadora abre uma sessão manual pela rota com "Abrir outra?" → abre como hoje; o fim de turno dela não conduz o ciclo, e ela não conta como sessão do ciclo · controller + passo + Postgres.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Ao fim da tarefa: `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` completos passando uma vez.
- Typecheck e lint do pacote sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. -->
- 2026-11-25 · 06.1 concluída: `stop` termina o ciclo e as duas sessões no mesmo tick; turnos sem etapa válida persistem `failed`, motivo e log; `retry` reenvia a mensagem da etapa à mesma sessão e rodada; uma gravação válida posterior destrava `failed`. V-06a–c passaram. Verificações: `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-failures.test.ts` (1 arquivo, 3 testes passaram); `pnpm --dir packages/api typecheck` (passou). Desvios registrados: criado `reviewStepTurnFailure.ts` para manter `reviewStepTurn.ts` no limite de 100 linhas; estendidos `ReviewCycleNext`, `DrizzleReviewCycleWorkerDao.transition` e `reviewLog.ts` para persistir e registrar falhas conforme REQ-024/NFR-06; reordenado `SessionControlsStep` em `sessionWorkerComposition.ts` para atender ao encerramento no mesmo tick exigido por V-06a.
- 2026-11-25 · 06.2 concluída: falha ao abrir, sessão encerrada ou interrompida durante a etapa deixa o ciclo em `failed` com o motivo correto; `retry` retoma a mesma sessão quando possível e abre substituta para sessão encerrada/não aberta, incrementando `attempt`; a sessão interrompida que aguarda é retomada quando a revisão devolve o turno. V-06d–g passaram. Verificações: `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-sessions.test.ts test/review-cycle-failures.test.ts` (2 arquivos, 7 testes passaram); `pnpm --dir packages/api typecheck` (passou). Desvios registrados: ampliados `ReviewCycleNext` e `DrizzleReviewCycleWorkerDao.sessionTurn` para expor tentativa, estado e sinais das sessões; ajustes em `ReviewStepActions`, `sessionWorkerComposition.ts` e `sessionWorkerParts.ts` para substituição e validação do catálogo Codex; criado `review-cycle-sessions-support.ts` para manter os testes abaixo do limite de linhas e sincronizar o relógio controlado com os eventos persistidos.
- 2026-11-25 · 06.3 concluída: cada tick valida a posse, o planejamento aprovado e a legibilidade do conjunto antes de ações ou transições; divergência termina em `stopped`, salva o motivo e encerra ambas as sessões no mesmo tick. Turnos da sessão fora do papel atual são ignorados; a sessão recebe continuação quando seu papel volta. V-06h–i passaram, cobrindo `executing` e `caveats`. Verificações: `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-guards.test.ts` (1 arquivo, 7 testes passaram); `pnpm --dir packages/api typecheck` (passou). Desvios registrados: criado `reviewStepGuards.ts`; conectados os leitores de claim, planejamento aprovado e conjunto em `sessionWorkerParts.ts`; `ReviewCycleNext` e `DrizzleReviewCycleWorkerDao.transition` agora persistem `stopReason`; `ReviewStepTurn.finish` registra o motivo em `cycle_finished`; criado `review-cycle-guards-support.ts` para os cenários de integração.
- 2026-11-25 · 06.4 concluída: depois de reiniciar, o ciclo em execução detecta a interrupção, falha e `retry` retoma o mesmo `sessionId` com o histórico; uma sessão criada antes da falha em `setSession` é encontrada pela `request_key` e vinculada sem duplicação. V-06j–k passaram. Verificações: `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-restart.test.ts` (1 arquivo, 2 testes passaram); `pnpm --dir packages/api typecheck` (passou). Desvios registrados: acrescentado `reviewCycles` a `WorkerOverrides` como ponto de injeção do erro em `setSession`; criado `review-cycle-restart-support.ts` para preparar uma execução ativa e compartilhar consultas dos testes; nenhuma alteração em `reviewStepOpen.ts` foi necessária, pois a busca pela request key e a unicidade existentes já recuperam a sessão.
- 2026-11-25 · 06.5 concluída: exclusão para ciclos ativos, inclusive `failed`, persiste `stopped`, solicita fim das sessões ligadas e aguarda que fiquem finais antes de prosseguir; a purga remove rodadas antes dos ciclos e de ambas antes das sessões; sessões manuais abertas com `allowAdditional` seguem sem vínculo com o ciclo e seus turnos são ignorados. V-06l/m e V-13d/e passaram. Verificações “Pronto quando”: `pnpm --dir packages/api exec vitest run src/infra/database/dao/issue-deletion/deletionPurge.test.ts` (1 arquivo, 3 testes passaram); `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-deletion.test.ts test/issue-deletion-terminal.test.ts test/issue-deletion-purge.test.ts` (3 arquivos, 8 testes passaram); `pnpm --dir packages/api typecheck` (passou). Desvios registrados: `CoordinatedDeletionStop` agora emite `cycle_finished`; `IssueDeletionDao.remainingActiveWork` inclui sessões vinculadas ao ciclo para impedir purga antecipada. Gates completos da Task 06 ainda pendentes.
- 2026-11-25 · gates completos da Task 06: `pnpm --dir packages/api test` (136 arquivos, 849 testes passaram) e `pnpm --dir packages/api test:integration` (178 arquivos; 844 passaram, 5 ignorados, 1 falha intermitente em `codex-secret-answer.test.ts`, que passa 3/3 isolada e não toca a revisão) · `pnpm --dir packages/api typecheck` (passou; o pacote não tem script de lint). Desvios: (1) a primeira rodada completa teve 117 falhas porque `buildWorkerParts` passou a montar o launcher do terminal, que lê `GITHUB_REPOSITORY_*` do ambiente; o launcher agora é criado sob demanda (`infra/lazyReviewLauncher.ts`) e `vitest.integration.config.ts` ganhou `env` de teste com valores fictícios dessas três variáveis, para o worker abrir sem o `.env` do web; (2) o teste V-05h da 05 ("ciclo inalterado sem etapa") contradizia a 06.1 (REQ-024 leva a `failed`) e foi atualizado; (3) `review-cycle-caveats/rounds/pending.test.ts` avançam o relógio falso até `Date.now()` (`cycleAtCurrentTime`), porque a 06 passou a tratar turno sem etapa como falha e o relógio de 2026-11-23 deixava turnos antigos parecerem novos; V-05d ganhou uma pergunta no roteiro da rodada 3 e V-05a espera o estado `approved` em vez de contar ticks.
- 2026-11-25 · Correção da review-001 (I-1, M-1): a cada tick, `ReviewStepOpen.openMissing` registra ou abre a sessão do papel da vez que não tem sessão (revisão, execução e substitutas), com o prompt de ressalvas quando a rodada terminou em ressalvas; `ReviewCycleFinisher` encerra todas as sessões com `review_cycle_id` do ciclo, registradas ou não. "Tentar de novo" reenvia a mensagem de ressalvas (`reviewRetryPrompt.ts`). Testes novos: `review-cycle-recovery.test.ts` (V-06k executor, V-06l parada durante o launch), `review-cycle-retry.test.ts` (V-06b) e `reviewRetryPrompt.test.ts`.
- 2026-11-25 · Correção da review-002 (M-2, M-3): os testes novos `review-cycle-recovery.test.ts` e `review-cycle-retry.test.ts` não reaproveitam mais V-06b/V-06k/V-06l (usam REQ-020, REQ-025 e REQ-040); `review-cycle-recovery-support.ts` usa objeto de parâmetros no lugar de 4 argumentos.
