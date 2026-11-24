# Revisão de conformidade 001: Tarefas e plano de execução (Spec D) — PARCIAL

> **Data:** 2026-11-23 · **Escopo:** parcial, tasks 01 a 08 (a task_09, `in_progress`, ficou fora a pedido do usuário: V-41, V-42, V-43d, V-43f, NFR-15 e `PRODUCT.md` não foram julgados) · **Intervalo:** árvore de trabalho sobre `HEAD` (`e88ea67`); nada da Spec D está commitado, e o diff mistura as correções da Spec C
> **Spec:** `docs/specs/tarefas-e-plano-de-execucao/spec.md`, `_tasks.md`, `task_01.md` a `task_08.md` · **Regras lidas:** `CLAUDE.md` → `AGENTS.md`, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md` (idêntica a `.claude/rules/`), `.agents/rules/e2e-testing.md`, skills `layered-backend`, `trpc-nextjs`, `nextjs-folder-structure`, `software-testing` (`references/revisao-e-diagnostico.md`)

## Veredito: REPROVADO (parcial)

Um bloqueante: o plano não fica preso à pasta do conjunto de tarefas. Quando a mesma Issue ganha um segundo `_tasks.md` em outra pasta (uma segunda spec, cenário previsto pela REQ-085 e pela B-32), o plano antigo passa a valer para o conjunto novo sem o aviso da REQ-097. O prompt aponta para a pasta nova e a captura olha a antiga, então as tarefas nunca chegam a "Concluída" (REQ-103, REQ-089). Há ainda dois importantes: a concorrência do salvamento não é provada no banco, e o link "Ver a conversa" não abre a sessão do item. O resto está bem coberto: as suítes e o typecheck passam, e todos os IDs de teste atribuídos às tasks 01 a 08 existem e verificam o efeito certo.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 1 | 2 | 3 | 3 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm --dir packages/api typecheck` | exit 0 | ✅ |
| `pnpm --dir apps/web typecheck` | exit 0 | ✅ |
| `pnpm --dir packages/api test` | exit 0 · 112 arquivos, 756 testes passando | ✅ |
| `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`) | exit 0 · 130 arquivos passando e 2 ignorados; 694 testes passando e 5 ignorados; 86 s | ✅ |
| `pnpm --dir apps/web test` | exit 0 · 97 arquivos, 488 testes passando | ✅ |
| `pnpm --dir apps/web lint` | exit 0, sem saída | ✅ |
| `pnpm --dir packages/api lint` | exit 254: o pacote não tem script `lint` (o `pnpm lint` da raiz roda só os pacotes que têm) | — não se aplica |
| `scan_diff.py --repo . --worktree --max-lines 100` | 281 arquivos. Pistas: o `test.fixme` do V-41 (task_09, fora do escopo); `console.log` no spike (só o script manual da task_01, fora do produto); asserções "removidas" em `session-decision`, `session-send` e `session-real-permissions` (conferidas: são só a troca para objeto de parâmetros, e nenhuma asserção se perdeu); `schema.ts` com 127 linhas (já tinha 130 no `HEAD`, então não piorou) | 0 achados novos |
| Varredura própria das regras (funções > 30 linhas, linhas em branco em funções, > 3 parâmetros) nos 237 `.ts`/`.tsx` alterados | 1 pista (`answerMapper.ts`, falso positivo: são 3 parâmetros, e as vírgulas a mais estão nos tipos) | ✅ |
| `grep -rn ClaudeSessionRuntime packages/api/src packages/api/test`; SDK fora de `infra/terminal/`; `git status` das tabelas legadas e de `infra/agents`, `application/agents` | vazio nos três | ✅ |

Não rodados: o e2e (`task-plan.spec.ts` e `session-conversation.spec.ts`), o smoke V-42 e o `pnpm build`, todos da task_09.

## Conformidade com a spec

| Item | Status | Evidência |
|---|---|---|
| 7.3 / REQ-090 (manifesto válido, motivos exatos, ordem das checagens) | ✅ | `taskManifestParser.ts:34-46`, `manifestProblems.ts`; V-34a a V-34g (`taskManifestParser.test.ts`), incluindo `file: ../x.md` |
| 7.2 / B-33 / B-34 / REQ-091 | ✅ | `taskFileParser.ts`, `miniTaskCount.ts`, `taskSetReader.ts:24-30`; V-34h a V-34l |
| REQ-086 / B-32 / REQ-089 / 7.1 / REQ-085 (leitura) | ✅ | `taskSetLoader.ts`, `drizzleTaskSetReadDao.ts`, `taskSetController.ts`; V-34m a V-34q com Postgres |
| §14 migration 0050 e rollback | ✅ | `drizzle/0050_session_plans.sql` confere com a §14 coluna a coluna; journal idx 50 e `FEATURE_MIGRATIONS`; V-43a a V-43c |
| 7.4 / REQ-094 / REQ-110 / NFR-16 (catálogo) | ✅ | `sessionAgentCatalog.ts`; V-44a a V-44c; o servidor recusa o esforço fora do enum (o V-33 mostrou que o SDK não recusa) |
| REQ-092, REQ-095, REQ-096, 7.8 (regras do plano) | ✅ | `planRules.ts`, `planOrder.ts`; V-35a a V-35f; a mensagem exata da US-13.4 sai em `findOrderProblem` |
| REQ-097 / REQ-099 (reconciliação e "Sem sessão") | 🟡 | Atende dentro da mesma pasta (V-35k, V-35l, V-35n). Quando o conjunto muda de pasta, o plano antigo não fica `stale` (achado **B-1**) |
| REQ-098 / DEC-25 (versão otimista) | 🟡 | O código está certo (`drizzlePlanSave.ts:14-24`), mas o V-36d só exercita a pré-checagem do serviço (achado **I-1**) |
| REQ-100 / 7.5 / B-39 / REQ-105 (estados e "de novo") | ✅ | `planReadiness.ts`, `planItemSessions.ts` (`bool_or(started_at)`); V-35g a V-35j e V-35m; V-37g e V-37m |
| REQ-101 / DEC-24 / DEC-28 (escolha no `start` e no `resume`, registro por agente) | ✅ | `sessionStarter.ts:26-32`, `sessionResume.ts:43-56`, `agentSdkQueryOptions.ts:36-37`; V-38a a V-38e |
| REQ-102 ("mesmo assim" com registro) | ✅ | `sessionPurpose.ts:44-49` e `:59-65`; V-37k, V-37l (relógio controlado); V-40q |
| REQ-103 / DEC-23 / B-40 / B-37 (captura no plano) | 🟡 | `planCaptureRule.ts`, `terminalEventIngestion.ts` (`planSkillOf`); V-39a a V-39f. A pasta usada é a do plano salvo, que pode não ser a do conjunto ativo (achado **B-1**) |
| REQ-104 (estado da sessão do item com link; histórico com a escolha) | 🟡 | O histórico atende (V-40s). O link "Ver a conversa" leva sempre à sessão mais recente da tarefa (achado **I-2**) |
| REQ-083 / REQ-084 / REQ-109 / 7.6 / B-35 (geração) | ✅ | `taskPlanPrompts.ts`, `purposeSpecs.ts`, `GenerateTasksAction.tsx`; V-37c, V-37f, V-37h, V-37i, V-40k, V-40l |
| NFR-16 (caminhos sem `..`, escolha validada no servidor, `strict`) | ✅ | `taskPlanPrompts.ts:7-19`; `schemas/plan.ts`; V-37e, V-37n, V-36g, V-44d a V-44g |
| REQ-107 / 7.7 / B-36 / B-41 | ✅ | `executionPlanController.ts:47-50`, `planAuthorization.ts`; `open` com `requireOperate` e `session_already_active`; V-36h, V-37j, V-40p |
| REQ-108 (exclusão) | ✅ | `deletionPurge.ts` (os passos novos); V-36c |
| REQ-087, REQ-088, REQ-106, NFR-17 (tela) | ✅ | `taskSetModel.ts`, `TasksStage.tsx`, `PlanTaskSessionSelect.tsx` (select nativo), `role="status"` nos avisos; V-40a a V-40j, V-40o a V-40r |
| §19 (logs `[plan]` e `[session]` com a escolha) | ✅ | `planLog.ts`; `sessionStarter.ts:32`; V-36d, V-36e, V-37l |
| §9 Não muda: rota sem modelo; lista geral de artefatos; captura sem skill fora do plano; REQ-014; tabelas legadas | ✅ | V-38c, V-37a, V-39c, V-37j; `task-artifacts-contract.test.ts` e `artifact-capture.test.ts` seguem verdes na integração; `git status` limpo nas tabelas legadas |
| DEC-27 (`yaml` fixado, só no frontmatter) | ✅ | `packages/api/package.json`: `"yaml": "2.9.1"`; único import em `frontmatter.ts` |
| Fora de escopo (encadear, trocar de modelo no meio, editar tarefas, worktrees, padrão por projeto) | ✅ | Nenhum caminho de código para eles |
| `tasks.plan.get` com `agents` | ✅ | Desvio registrado no Histórico da spec (08.3) |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| `.ts` com até 100 linhas (`code-standards.md`, "File Size") | ✅ | Nenhum arquivo novo passa; `schema.ts` (127) já passava e diminuiu |
| Funções até 30 linhas, até 3 parâmetros, sem linha em branco interna, até 3 `if` encadeados | ✅ | Varredura própria e leitura dos arquivos centrais |
| Sem comentários | ✅ | O scanner não achou comentário adicionado |
| Constantes no lugar de strings mágicas | ✅ (1 menor) | `planStateModel.ts:23-24`: "Bloqueada: aguardando" e "Encerrada · " montados em linha, fora do `planCopy.ts` (M-3) |
| Contratos em `application/`, implementações em `infra/`; SDK só em `infra/terminal/` (`_tasks.md`, "Restrições globais") | ✅ | `executionPlanDao.ts` e `taskSetReadDao.ts` em `application/database/dao/`; Drizzle em `infra/database/dao/plans` e em `artifacts`; grep do SDK vazio fora de `infra/terminal/` |
| Entrypoint fino, erros nomeados traduzidos no controller (`layered-backend`, `trpc-nextjs`) | ✅ | `routers/plan.ts`, `routers/taskSet.ts`: builder, input e uma chamada; `TaskError` → `planErrorCatalog` → `taskErrorMapper` |
| Pasta da feature e `"use client"` mínimo (`nextjs-folder-structure`) | ✅ | Tudo em `features/issues/assigned-work/`, sem importar feature vizinha |
| Testes com o efeito observável, oráculo da spec (`software-testing`) | ✅ (1 importante) | Valores esperados são os textos da spec; relógio controlado (`HARNESS_NOW`); temporizadores falsos no V-40g. A exceção é o I-1 |
| Verificação proporcional e sem `TEST_DATABASE_URL` (`AGENTS.md`) | ✅ | A integração foi rodada sem a variável |

## Achados

### task_04 · task_05 · task_06

#### B-1 (Bloqueante) — O plano não fica preso à pasta do conjunto, e com um segundo `_tasks.md` ele vale para outro conjunto sem aviso
- **Onde:**
  - `packages/api/src/application/services/tasks-set/planReconciliation.ts:21`: `if (plan.manifestVersion === set.manifestVersion) return false;` compara números de versão de artefatos diferentes quando `plan.tasksFolder !== set.folder`;
  - `packages/api/src/infra/database/dao/plans/savedManifestGraph.ts`: o grafo salvo vem da pasta do plano, e dois conjuntos `task_01…task_03` com as mesmas arestas comparam como iguais;
  - `packages/api/src/application/services/terminal/purposePlanItem.ts:28`: o prompt usa `set.folder` (a pasta nova);
  - `packages/api/src/infra/database/dao/terminal/drizzleTerminalEventDao.ts:23`: a captura usa `taskSessionPlans.tasksFolder` (a pasta antiga).

  Nenhum código compara `plan.tasksFolder` com `set.folder`: o grep só acha a leitura e a gravação.
- **Contra:** REQ-097 (avisar quando o manifesto muda), REQ-103 (capturar os `.md` "da pasta do conjunto de tarefas"), REQ-089, B-32 e REQ-085 (várias specs por tarefa é um caminho previsto).
- **Problema:**
  1. A pessoa monta e salva o plano de `docs/specs/a/` (`_tasks.md` v1).
  2. Depois gera as tarefas da segunda spec, e `docs/specs/b/_tasks.md` v1 passa a ser o conjunto ativo (B-32).
  3. `plan.get` devolve `stale: false`, porque 1 === 1, e mostra as sessões antigas sobre as tarefas de `b`, que têm os mesmos ids.
  4. "Iniciar" manda o agente implementar `docs/specs/b/task_01.md`. Sem skill ativa, as edições em `docs/specs/b/` não casam com `docs/specs/a` e não viram artefato.
  5. A 01 de `b` nunca chega a "Concluída", e a sessão seguinte fica bloqueada para sempre, salvo "mesmo assim".

  Só um novo `save` regrava `tasks_folder`, e nada pede esse `save`.
- **Inferido da leitura:** nenhum teste cobre a troca de pasta.
- **Correção esperada:** um plano cuja `tasksFolder` difere de `set.folder` não pode valer para o conjunto atual. No mínimo, `stale: true`, o aviso da REQ-097, e `open` com `plan_item` recusado até o plano ser salvo de novo. Também deve haver um teste de integração com dois `_tasks.md` em pastas diferentes e o mesmo grafo. Como tratar as sessões já iniciadas do plano antigo é decisão de produto (ver "Atualizações de spec").

#### I-1 (Importante) — A concorrência do salvamento não é provada no banco
- **Onde:**
  - `packages/api/test/plan-save.test.ts:15-26`: o V-36d salva com `version: 1` depois de outro salvamento já concluído;
  - `packages/api/src/application/services/tasks-set/planSaveService.ts:25` (`requireVersion`): a recusa acontece nessa pré-checagem do serviço, antes de qualquer SQL;
  - `drizzlePlanSave.ts:16-23`: o `UPDATE … WHERE version = :version` e o `INSERT … ON CONFLICT DO NOTHING` da versão 0 nunca devolvem `"conflict"` em nenhum teste (o grep por `conflict`, `Promise.all` e `savePlan` nos testes não acha nada).
- **Contra:** REQ-098, DEC-25 e §22 ("Postgres descartável no salvamento com versão… O risco ali é SQL e concorrência").
- **Comportamento que escapa:** tirar `eq(taskSessionPlans.version, input.version)` do `where`, ou o `onConflictDoNothing`, mantém a suíte verde. Duas abas que leem a versão 1 e salvam ao mesmo tempo passam as duas pela pré-checagem, e só o SQL impede que a segunda sobrescreva a primeira.
- **Consequência:** a única barreira real da REQ-098 está sem prova.
- **Correção mínima:** um teste de integração com dois `plan.save` concorrentes (`Promise.all`) na mesma versão, e outro com dois primeiros salvamentos em `version: 0`. Em cada caso, exatamente um devolve a versão nova, o outro devolve `plan_conflict`, e os itens no banco são os do vencedor.

### task_08

#### I-2 (Importante) — "Ver a conversa" ignora o id da sessão do item
- **Onde:**
  - `apps/web/src/features/issues/assigned-work/components/OperatorStages.tsx:32`: `const showExecution = () => setFocus(...)` descarta o `sessionId` que `PlanSessionState.tsx` passa;
  - `ExecutionStage.tsx:15`: a aba mostra `latestSession(detail)`.
- **Contra:**
  - REQ-104: "Cada sessão do plano DEVE mostrar o estado da sessão mais recente dela, com o link para a conversa";
  - `task_08.md`, Detalhes: "Se não houver como abrir uma sessão pelo id, mostre o estado da sessão sem link".
- **Problema:** no fluxo normal (Sessão 1 encerrada, Sessão 2 iniciada depois), o link da Sessão 1 abre a conversa da Sessão 2. O implementador registrou a limitação na 08.4, mas fez o contrário do que a tarefa mandava. O V-40r só verifica que o callback recebe o id, não que a conversa certa aparece.
- **Correção esperada:** o foco leva o `sessionId`, e a etapa de execução abre essa sessão, por exemplo expandindo-a no `ExecutionHistory`. Se não der, o link sai, como a tarefa pedia. Também deve haver um teste em que o link da Sessão 1 mostra a conversa da Sessão 1 com uma sessão mais nova presente.

### task_04 (extra) · task_02

#### M-1 (Menor) — `ReadAccessGate`: cache de autorização sem teste e sem despejo
- **Onde:** `packages/api/src/application/services/projects/readAccessGate.ts:7-16`. O `Map` cresce a cada par usuário e projeto e nunca é limpo. Durante 10 s, quem perdeu o acesso continua lendo `taskSet.get`, `plan.get` e passando pelo `requireTask` do `plan.save`. Nenhum teste referencia a classe.
- **Contra:** §18 ("Autorização no controller, a cada chamada"). Foi registrado como extra na 04.3, mas não é uma decisão da spec.
- **Correção esperada:** um teste com relógio controlado (dentro e depois do TTL, e com a recusa propagada), e as entradas vencidas removidas. Ou então a spec aceitar o cache (ver "Atualizações de spec").

#### M-2 (Menor) — `[plan] manifest_invalid` a cada leitura em polling
- **Onde:** `taskSetLoader.ts:27`, chamado por `TaskSetController.get` a cada 5 s por aba aberta (`useTaskSet`).
- **Contra:** §19 lista o evento "manifesto inválido (motivo)", não uma repetição a cada 5 s.
- **Correção esperada:** registrar uma vez por versão do manifesto inválido, ou rebaixar a repetição.

#### M-3 (Menor) — Textos montados fora dos arquivos de copy
- **Onde:** `apps/web/src/features/issues/assigned-work/planStateModel.ts:23-24`: "Bloqueada: aguardando " e "Encerrada · " em linha.
- **Contra:** `task_08.md` ("Os textos ficam em `planCopy.ts`… exatos como na spec") e `code-standards.md` (strings mágicas).
- **Correção esperada:** mover os prefixos para `planCopy.ts`.

## Atualizações de spec a discutir

1. **Plano e troca de conjunto (B-1).** A spec não diz o que acontece com o plano quando o conjunto ativo passa a ser de outra pasta (B-32), em especial com as sessões já iniciadas, cujos ids de tarefa coincidem com os do conjunto novo. Sugestão: uma regra REQ-097b, "plano de outra pasta: aviso, nenhuma sessão iniciável até salvar; as iniciadas ficam só no histórico".
2. **`stale` pelo grafo, e não pelo número da versão.** Está em `_tasks.md`, "Premissas e bloqueios", marcado "a confirmar com o usuário", e o código já o implementa (`planReconciliation.ts:20-23`). A REQ-097 ainda diz "ganhar uma versão nova". A premissa faz sentido, porque cada sessão atualiza a tabela "Estado", mas a spec deveria registrá-la.
3. **Cache de 10 s na leitura (M-1).** Ou a §18 aceita a janela, por causa do polling de 5 s e do custo de chamar o GitHub, ou o cache sai.

## Divergências entre o relatório do implementador e a evidência

- Os números das suítes conferem com os da minha execução: API 756, integração 694 + 5 ignorados, web 488.
- 08.4: "o link não abre uma sessão específica pelo id" está registrado, mas a tarefa mandava, nesse caso, mostrar o estado sem link. A mini-tarefa foi marcada `[x]` mesmo assim (I-2).
- Nenhuma marca `[x]` das tasks 01 a 08 foi contrariada pela execução. Os achados B-1 e I-1 são de cobertura e de caso não previsto, não de afirmação falsa.

## Prompt de correção

> Corrija, nesta ordem, sem alterar nada fora do listado. Siga `.agents/rules/code-standards.md` (arquivos `.ts` com até 100 linhas, funções com até 30, sem comentários, constantes no lugar de strings) e a skill `software-testing`.
>
> 1. **B-1 (task_04, 05 e 06)**: um plano salvo para outra pasta não pode valer para o conjunto atual.
>    - Em `packages/api/src/application/services/tasks-set/planReconciliation.ts`: `plan.tasksFolder !== set.folder` resulta em `stale: true`, antes de comparar a versão ou o grafo.
>    - Em `packages/api/src/application/services/terminal/purposePlanItem.ts` (`loadItem`): `open` e `preflight` com `plan_item` recusam um plano de outra pasta com `task_set_unavailable` (ou com uma razão nova, se a spec for atualizada), até um novo `plan.save` regravar `tasks_folder`.
>    - Teste de integração novo em `packages/api/test/`: plano salvo em `docs/specs/a` (`_tasks.md` v1, `task_01`→`task_02`), depois `docs/specs/b/_tasks.md` v1 com o mesmo grafo e capturado mais tarde. O teste espera `plan.get` com `stale: true`, `open` do item recusado e, depois de um `plan.save`, a captura de `docs/specs/b/task_01.md` como `plano-de-execucao`.
> 2. **I-1 (task_04)**: em `packages/api/test/plan-save.test.ts` (ou num arquivo novo, se passar de 100 linhas), dois testes com Postgres.
>    - Dois `plan.save` concorrentes com `version: 1` (`Promise.all`): exatamente um resolve com `{ version: 2 }`, o outro rejeita com `plan_conflict`, e os itens no banco são os do que resolveu.
>    - O mesmo com dois primeiros salvamentos em `version: 0`: um cria com `version: 1`, e o outro dá `plan_conflict`.
>    - Antes de considerar o teste pronto, confira que ele falha se o `eq(taskSessionPlans.version, input.version)` de `drizzlePlanSave.ts` for removido, e depois restaure o filtro.
> 3. **I-2 (task_08)**: o "Ver a conversa" de `PlanSessionState.tsx` tem de abrir a sessão `latestSessionId` do item.
>    - Em `OperatorStages.tsx`, o foco passa a levar o `sessionId`, e `ExecutionStage` e `ExecutionHistory` abrem essa sessão.
>    - Teste RTL: com a Sessão 1 do plano encerrada e uma sessão mais nova de outro item, o link da Sessão 1 mostra a conversa da Sessão 1.
>    - Se abrir pelo id não for viável, remova o link, como pede a `task_08.md`, e ajuste o V-40r.
> 4. **M-1 (task_04)**: em `packages/api/src/application/services/projects/readAccessGate.ts`, remova as entradas vencidas e crie `readAccessGate.test.ts` com relógio injetado. Casos: segunda chamada dentro de 10 s sem `requireRead`; chamada depois de 10 s com `requireRead`; recusa propagada e não guardada.
> 5. **M-2 (task_02)**: `taskSetLoader.ts` não deve registrar `[plan] manifest_invalid` a cada poll. Registre uma vez por par (pasta, versão do manifesto).
> 6. **M-3 (task_08)**: mova "Bloqueada: aguardando" e "Encerrada · " de `planStateModel.ts` para `planCopy.ts`.
>
> Ao terminar, rode e mostre a saída de:
> - `pnpm --dir packages/api typecheck` e `pnpm --dir apps/web typecheck`;
> - `pnpm --dir packages/api test`;
> - `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`);
> - `pnpm --dir apps/web test` e `pnpm --dir apps/web lint`.
>
> Não marque nada como concluído sem essa saída. Registre cada correção no "Registro de execução" da tarefa correspondente.
