# Revisão de conformidade 002 (parcial): Acompanhamento e artefatos da execução no terminal

> **Data:** 2026-11-22 · **Escopo:** parcial, a pedido do usuário. Feature inteira, menos a mini-tarefa 08.2 (smoke V-19 na tela), que o usuário vai testar à mão e decidir. Foco nas correções da review-001 e em tudo o que elas tocaram. · **Intervalo:** `HEAD` + mudanças não commitadas
> **Spec:** `spec.md`, `v15-spike.md`, `_tasks.md`, `task_01.md`–`task_08.md`, `reviews/review-001.md`
> **Regras lidas:** as da review-001 (`AGENTS.md`, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md`, `.agents/rules/e2e-testing.md`, `layered-backend`, `trpc-nextjs`, `nextjs-folder-structure`), mais `software-testing` (`references/revisao-e-diagnostico.md`) para julgar os testes

## Veredito: APROVADO COM RESSALVAS (parcial)

As sete correções pedidas na review-001 estão no código, e as verificações passam. Sobram 2 achados menores:
- o corte de 500 caracteres da M-2 não cobre o evento `skill` vindo do prompt;
- a ligação do modo leitura na linha do tempo (I-1) não tem teste que a proteja.

Este veredito não cobre a 08.2: a task_08 continua `in_progress`, e o veredito final da feature depende do smoke V-19 na tela ou do aceite do risco.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 0 | 0 | 2 | 2 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm typecheck` | exit 0 | ✅ |
| `pnpm lint` | exit 0 | ✅ |
| `pnpm --dir packages/api test` | exit 0 · 90 arquivos, 594 passed | ✅ |
| `pnpm --dir apps/web test` | exit 0 · 75 arquivos, 357 passed | ✅ |
| `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`) | exit 0 · 91 arquivos, 523 passed | ✅ |
| `pnpm build` | exit 0 · rota `ƒ /api/terminal-sessions/events` | ✅ |
| `scan_diff.py --worktree --max-lines 100` | hints iguais aos da review-001 no código da feature; novos só em `.agents/skills/software-testing/` e `.claude/skills/software-testing/` (fora da feature) | — |
| Checagem de limites (arquivo ≤ 100, função ≤ 30, ≤ 3 parâmetros, linhas em branco) nos arquivos alterados | só `schema.ts` (129 linhas, já tinha 127 em `HEAD`) | ✅ |
| Sondagem `tsx`: `summarizeHookEvent` com prompt `/` + 600 caracteres | `[["prompt", 500], ["skill", 600]]` | ❌ → M-1 |

### Mutação das correções (cada arquivo restaurado depois)

| Correção | Mutação | Testes afetados | Resultado |
|---|---|---|---|
| I-1, modelo | `sessionShortLabel(session, { reader: false })` em `planningModel.ts` | pasta `assigned-work` | 2 falham ✅ |
| I-1, ligação | `reader={false}` em `PlanningStage.tsx` | pasta `assigned-work` (149 testes) | **todos passam** ❌ → M-2 |
| M-1 (review-001) | remover `if (!session.active) return eventAccepted();` em `route.ts` | `terminal-event-route*.test.ts` | 1 falha ✅ |
| M-2 (review-001) | `summary: relative` sem `clip` em `hookToolEvents.ts` | `hookEventSummarizer.test.ts` | 1 falha ✅ |
| M-3 (review-001) | tirar o filtro `projectId` em `drizzleTerminalExecutionDao.ts` | `terminal-execution-read.test.ts` | 1 falha ✅ |
| M-4 (review-001) | `updatedAt: new Date()` de volta no upsert de falha | `artifact-capture-history.test.ts` | 1 falha ✅ |

**Não executado:** smoke V-19 na tela e e2e V-19a/b (`test.fixme`, P-G). Estão fora do escopo desta revisão, por decisão do usuário.

## Correções da review-001

| Achado | Status | Evidência |
|---|---|---|
| I-1: modo leitura na linha do tempo | ✅ código / 🟡 teste | `planningModel.ts:40-48` (`timelineEntries(detail, { reader })`), `PlanningTimeline.tsx:29-30`, `PlanningStage.tsx:69` (`reader={actions === null}`); `PlanningTimelineExecution.test.tsx` cobre o componente isolado; a ligação em `PlanningStage` não tem teste → M-2 |
| I-2: V-19 na tela | fora do escopo | 08.2 e V-19c desmarcados em `task_08.md:60,106`; task_08 `in_progress`; pendência registrada em `spec.md:3,454,465`. A afirmação agora corresponde à evidência |
| M-1: estado final antes de ler o corpo | ✅ | `route.ts:12`; `terminalEventController.ts:16-20` (`active: isActiveSession(...)`); teste em `terminal-event-route-limits.test.ts`; mutação detectada |
| M-2: `summary` ≤ 500 | 🟡 | `hookSummaryLimits.ts`; `clip` em `hookToolEvents.ts:29,35,42` e `hookEventSummarizer.ts:35,43,49,53`; falta `hookEventSummarizer.ts:37` → M-1 |
| M-3: expiração no escopo do projeto | ✅ | `tasksController.ts:27`; `drizzleTerminalExecutionDao.ts:36-39`; teste nos dois sentidos em `terminal-execution-read.test.ts`; mutação detectada |
| M-4: horário da última versão | ✅ | `artifactVersionWrites.ts:8` (`set: { lastFailure: failure }`); teste em `artifact-capture-history.test.ts`; mutação detectada |
| M-5: limites de função e parâmetros | ✅ | `useTerminalLaunch.ts` dividido em `useTerminalSender` + `useTerminalLaunch`; `seedEvents`, `seedAttachment`, `seedArtifact` e `openSession` com objeto de parâmetros; checagem de limites limpa |

## Conformidade com a spec

Os itens que as correções não tocaram mantêm o status e a evidência da review-001: REQ-016 a REQ-023, REQ-026, REQ-034, REQ-041 a REQ-044, REQ-046 a REQ-050, NFR-02 a NFR-09, DEC-02 a DEC-14, B-05 a B-21, "Não muda" #1 a #4 e MIG-a–f. Os arquivos tocados foram relidos e as suítes reexecutadas, sem regressão.

| Item tocado pelas correções | Status | Evidência |
|---|---|---|
| REQ-024, P-J (modo leitura) | ✅ | etapa, aba e linha do tempo usam o rótulo de leitura; teste da ligação é M-2 |
| REQ-018, §14 (`summary` ≤ 500) | 🟡 | todos os tipos cortados, menos `skill` vindo do prompt → M-1 |
| §16 passo 1, B-06 | ✅ | sessão final → `204` sem ler o corpo nem gravar |
| §18, REQ-021, DEC-07 | ✅ | expiração filtra por `projectId` e `taskId` |
| REQ-045 | ✅ | `updatedAt` só muda com versão nova |
| REQ-014 (UI, depois da divisão do hook) | ✅ | `TerminalSessionConfirm.test.tsx`, `TerminalLaunchDialog.test.tsx`, `TerminalLaunchConfirm.test.tsx` passam |
| V-19 / 08.2 | fora do escopo | pendente com o usuário |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| Sem comentários (`code-standards.md:5`) | ✅ | scanner sem `comment-added` no código da feature |
| Máx. 100 linhas por `.ts` (`code-standards.md:39`) | ✅ | maior arquivo novo: `hookEventSummarizer.test.ts` com 95; `schema.ts` pré-existente |
| Funções ≤ 30 linhas (`code-standards.md:82`) | ✅ | `useTerminalSender` e `useTerminalLaunch` dentro do limite |
| ≤ 3 parâmetros (`code-standards.md:154`) | ✅ | helpers convertidos para objeto |
| Textos mágicos (`code-standards.md:221`) | ✅ | `TEXT_SUMMARY_LIMIT`, `COMMAND_SUMMARY_LIMIT` nomeados |
| Contratos em `application/`, implementações em `infra/` (`layered-backend`) | ✅ | o escopo `{ projectId, taskId }` passa pela interface `TerminalExecutionDao` |
| `.agents/rules` = `.claude/rules` (`AGENTS.md:16`) | ✅ | sem diferença |

## Achados

### task_03 · 03.2

#### M-1 (Menor): o evento `skill` vindo do prompt escapa do corte de 500
- **Local:** `packages/api/src/application/services/terminal/hookEventSummarizer.ts:37`, `events.push({ kind: "skill", summary: skill, path: null, skill })`.
- **Evidência (confirmada por execução):** com prompt `/` + 600 caracteres, `summarizeHookEvent` devolve `skill` com `summary` de 600. O check `task_terminal_events_summary_check` (≤ 500, provado por MIG-b) rejeita o insert. A consequência no route é inferida do código: o `ingest` não trata o erro.
- **Comportamento que escapa:** o teste novo cobre o caminho longo e a ferramenta Skill, mas não o `/<skill>` digitado. `skillCommand.ts:1` aceita nomes de qualquer tamanho.
- **Consequência:** o lote inteiro do hook se perde, com o `prompt`, o `started` implícito e a mudança de estado, e o route responde 500 em vez de 204/401/413 (§15). O `spec.md:465` registra "`summary` cortado em 500 em todos os tipos", o que não procede.
- **Correção mínima:** `summary: clip(skill)` (e, se quiser, também o `skill` gravado). Teste: prompt `/` + 600 caracteres → `skill` com `summary` de 500.

### task_06 · 06.1 (correção I-1)

#### M-2 (Menor): nenhum teste protege a ligação do modo leitura na linha do tempo
- **Local:** `apps/web/src/features/issues/assigned-work/components/PlanningStage.tsx:69`, `reader={actions === null}`.
- **Evidência (confirmada por mutação):** trocando por `reader={false}`, os 149 testes de `src/features/issues/assigned-work` passam. `PlanningTimelineExecution.test.tsx` renderiza a `PlanningTimeline` com `reader` direto, e `PlanningStage.test.tsx` (UT-064) testa o leitor sem sessão.
- **Comportamento que escapa:** uma regressão em `PlanningStage` ou em `OperatorStages` volta a mostrar "Aguardando você" a quem só lê (P-J, REQ-024), sem nenhum teste falhar.
- **Correção mínima:** um teste de `PlanningStage` com `actions={null}` e sessão `waiting` que espera "Aguardando a pessoa operadora" na linha do tempo. Verificação: a mesma mutação deve fazer esse teste falhar.

## Atualizações de spec a discutir

Continuam abertas desde a review-001, sem mudança:
- **S-1:** sessões abandonadas nunca ficam finais. Por isso a tela da tarefa consulta o servidor a cada 3 s para sempre, e cada nova abertura pede a confirmação da REQ-014.
- **S-2:** a NFR-02 diz que o token deixa de valer no estado final; a §16 manda responder `204`. O código segue a §16.

## Divergências entre o relatório do implementador e a evidência

- **`spec.md:465`, "`summary` dos eventos é cortado em 500 em todos os tipos":** falso para o `skill` vindo do prompt (M-1).
- **A 08.2 e o V-19c agora estão desmarcados**, coerentes com a evidência.
- As contagens das suítes relatadas na rodada de correção (594 / 523 / 357) batem com esta revisão.
- As correções foram aplicadas na mesma conversa que fez a review-001. Esta revisão não se apoiou nesse relato: cada correção foi conferida no código, pelas suítes e pela mutação acima.

## Observação fora da feature

As pastas `.agents/skills/software-testing/` e `.claude/skills/software-testing/` aparecem como não rastreadas, com evals, fixtures e um `package.json`. Não fazem parte desta feature e não foram revisadas; vale separá-las no commit.

## Prompt de correção

> Corrija, nesta ordem, sem alterar nada fora do listado:
> 1. **M-1** (`packages/api/src/application/services/terminal/hookEventSummarizer.ts:37`): o evento `skill` gerado por um prompt `/<skill>` usa `summary: clip(skill)`, como os demais tipos (§14, REQ-018). Teste em `hookEventSummarizer.test.ts`: prompt `/` + 600 caracteres → evento `skill` com `summary` de 500.
> 2. **M-2** (`apps/web/src/features/issues/assigned-work/components/PlanningStage.test.tsx`): acrescente um teste que renderiza `PlanningStage` com `actions={null}` e uma sessão `waiting` (`detailWith([sessionOf({ status: "waiting" })])`) e espera "Aguardando a pessoa operadora" na linha do tempo, sem "Aguardando você" (P-J). Confirme que o teste falha se `PlanningStage.tsx` passar `reader={false}`, e restaure.
>
> Restrições: arquivos `.ts` ≤ 100 linhas, funções ≤ 30 linhas e ≤ 3 parâmetros, sem comentários, sem novas dependências.
> Ao terminar, rode e mostre a saída de:
> - `pnpm --dir packages/api exec vitest run src/application/services/terminal/hookEventSummarizer.test.ts`;
> - `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work`;
> - `pnpm typecheck`;
> - `pnpm lint`.
>
> Não marque como concluído sem essa saída.
