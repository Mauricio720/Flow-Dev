# Revisão de conformidade 003: Tarefas e plano de execução (Spec D) — PARCIAL

> **Data:** 2026-11-23 · **Escopo:** parcial, tasks 01 a 08, sem a task_09 (continua `in_progress`). Esta revisão cobre as correções da [review-002](review-002.md) e o que elas tocaram: a troca de pasta (servidor e tela), o foco da conversa e o registro da task_04. · **Intervalo:** árvore de trabalho sobre `HEAD` (`e88ea67`), sem commit
> **Spec:** `spec.md`, `_tasks.md`, `task_01.md` a `task_08.md` · **Regras lidas:** as mesmas das revisões anteriores

## Veredito: APROVADO COM RESSALVAS (parcial)

> **Atualização em 2026-11-23, depois da conversa com o usuário:** o veredito original era REPROVADO por um importante (I-1). O usuário decidiu que o caminho esperado para mudar de rumo é **editar a spec da mesma pasta**. Nesse caminho, a REQ-097 reconcilia o plano e não há troca de pasta. O tratamento da troca de pasta fica só como proteção, para quando o agente escolher outro nome de pasta por conta própria. Com isso, o I-1 virou **M-1 (menor)**: nada é apagado (as versões já capturadas, os eventos e a conversa continuam no banco, e o arquivo continua no clone), e o que deixa de ser criado são versões novas de um conjunto que já não está ativo. A correção do M-1 é opcional.

Nenhum bloqueante e nenhum importante. As três correções da review-002 estão no código e testadas, e a opção de adotar a pasta nova funciona. Ficam um menor e três atualizações de spec.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 0 | 0 | 1 | 3 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `vitest run src/application/services/tasks-set/ src/application/services/terminal/` (api) | exit 0 · 23 arquivos, 200 testes | ✅ |
| `vitest run --config vitest.integration.config.ts` com `plan-folder-change`, `plan-save`, `plan-save-rules`, `plan-save-concurrent`, `plan-read`, `plan-capture`, `terminal-open-plan-item`, `terminal-open-plan-item-again`, `terminal-preflight-purpose` e `issue-deletion-terminal` | exit 0 · 10 arquivos, 42 testes | ✅ |
| `vitest run src/features/issues/assigned-work/` (web) | exit 0 · 54 arquivos, 282 testes | ✅ |
| `pnpm --dir packages/api typecheck` · `pnpm --dir apps/web typecheck` · `pnpm --dir apps/web lint` | exit 0 nos três | ✅ |
| Suítes completas, nesta sessão, depois da última mudança de código | api 114/764; integração 132 + 2 ignorados / 700 + 5 ignorados; web 98/494 | ✅ |
| `scan_diff.py --repo . --worktree --max-lines 100` e a varredura própria (funções, parâmetros, linhas em branco) | só as pistas antigas, já conferidas (`fixme` do V-41, spike, `schema.ts` igual ao `HEAD`, falso positivo de `answerMapper.ts`) | — |
| Mutações dirigidas durante a correção | sem o descarte no DAO: falham 2 de `plan-folder-change`; sem o ramo da pasta em `planView`: falha 1; sem o consumo do foco: falha o teste de `OperatorStages`; `adopt` ignorando o rascunho: falha 1 de `PlanFolderChange`; código restaurado e conferido por `grep` | ✅ |

## Correções da review-002

| Achado | Status | Evidência |
|---|---|---|
| I-1 plano travado depois da troca de pasta | ✅ (1 menor novo) | `planView.ts`: plano vazio e `folderChange` quando a pasta difere; `planSaveService.ts` (`resetItems`); `drizzlePlanSave.ts` (descarte); `PlanFolderChange.tsx`, `useExecutionPlan.ts` (`adopt`), `usePlanPersistence.ts`; `plan-folder-change.test.ts` (4) e `PlanFolderChange.test.tsx` (4). Não há "Iniciar" para item recusado, e o salvamento existe sem edição. O descarte alcança sessões em andamento (achado **M-1**) |
| M-1 foco da conversa reaberto | ✅ | `ExecutionStage.tsx` (`onConversationShown` num efeito antes do retorno antecipado), `OperatorStages.tsx` (`clearConversation` antes do `return null`, ordem dos hooks preservada); teste em `OperatorStages.test.tsx` |
| M-2 frase do registro | ✅ | `task_04.md` agora nomeia os testes que falham sem a correção |

## Regressão no que as correções tocaram

| Item | Status | Evidência |
|---|---|---|
| REQ-098 / DEC-25 | ✅ | `plan-save-concurrent` e `plan-save` verdes; a versão é conferida antes do descarte, na mesma transação |
| REQ-096 (iniciada não muda) na mesma pasta | ✅ | Sem troca de pasta, `resetItems` é `false` e o caminho antigo vale (`plan-save-rules`, V-35e, V-36f) |
| REQ-103 (captura enquanto a sessão do plano está ativa) | ✅ (1 menor) | Atende, salvo depois de uma adoção da pasta com sessão antiga rodando, num conjunto que deixou de ser o ativo (**M-1**) |
| REQ-104 / histórico | ✅ | `ExecutionHistory.test.tsx` e `OperatorStages.test.tsx` verdes |
| REQ-107 | ✅ | O botão de adotar só aparece com `canEdit`; o servidor segue exigindo `requirePlanOperator` |
| NFR-17 | ✅ | O aviso usa `role="status"`; o botão é nativo |
| Regras do projeto nos arquivos tocados | ✅ | `useExecutionPlan` dividido (`usePlanPersistence.ts`); funções até 30 linhas; sem comentários |

## Achados

### task_04 · task_06 (regra nova da troca de pasta)

#### M-1 (Menor, rebaixado de Importante) — Adotar a pasta nova apaga o item de uma sessão antiga em andamento, que para de capturar
- **Onde:**
  - `packages/api/src/infra/database/dao/plans/drizzlePlanSave.ts:59`: `if (input.resetItems) await tx.delete(taskSessionPlanItems).where(eq(taskSessionPlanItems.planId, claimed.id));` apaga todos os itens, sem olhar se há sessão ativa;
  - `planSaveService.ts`: `resetItems` não confere o estado das sessões;
  - `drizzleTerminalEventDao.ts:23`: a captura obtém a pasta por `taskTerminalSessions.planItemId → taskSessionPlanItems → taskSessionPlans`. Com o item apagado, a FK `ON DELETE SET NULL` zera o `plan_item_id`, e `planTasksFolder` vira `null`.
- **Contra:**
  - REQ-103: "ENQUANTO uma sessão do plano estiver ativa, todo `.md` da pasta do conjunto de tarefas que ela criar ou editar DEVE virar artefato";
  - REQ-100: a sessão do plano em execução continua sendo do plano até chegar a um estado final.
- **Problema:**
  1. A Sessão 1 do plano de `docs/specs/a` está rodando.
  2. Noutra sessão, a pessoa gera as tarefas de outra spec (o `open` permite com a confirmação da REQ-014), e `docs/specs/b/_tasks.md` passa a ser o conjunto ativo.
  3. A tela mostra o aviso da troca, e a pessoa aciona "Usar as tarefas de docs/specs/b".
  4. O item da Sessão 1 é apagado. Daí em diante, as edições de `docs/specs/a/task_01.md` sem skill ativa deixam de virar artefato, e o `status: completed` que o agente gravar não aparece em lugar nenhum.

  Além disso, com a pasta trocada a tela esconde todos os itens antigos, então nada avisa que há uma sessão do plano ainda rodando.
- **Por que é menor:** a troca de pasta só acontece se o agente criar a spec noutra pasta. O caminho combinado é editar a spec da mesma pasta, e nele a troca não ocorre. Mesmo quando ocorre, nada é apagado: as versões já capturadas, os eventos (gravados com `skill` nula, como no V-39b) e a conversa continuam no banco, e o arquivo continua no clone. O que deixa de ser criado são versões novas de um conjunto que deixou de ser o ativo.
- **Inferido da leitura;** nenhum teste combina a adoção com uma sessão ativa. O teste de `plan-folder-change` semeia a sessão antiga como `ended`.
- **Correção opcional:**
  - o `save` com `resetItems` é recusado enquanto algum item do plano antigo tiver uma sessão ativa (`isActiveSession` da sessão mais recente), com uma razão própria e uma mensagem que diga o que fazer, por exemplo "Uma sessão do plano anterior ainda está em andamento. Encerre-a antes de usar as novas tarefas.";
  - o aviso da troca diz que há sessão em andamento, porque a tela já não mostra os itens antigos;
  - um teste de integração: item do plano antigo com sessão `running`, depois `save` na pasta nova → recusado, item e `plan_item_id` intactos, e uma edição dessa sessão em `docs/specs/a/task_01.md` capturada como `plano-de-execucao`.

## Atualizações de spec a discutir

1. **Registrar o caminho de mudança de rumo e a regra da troca de pasta.** Decisão do usuário em 2026-11-23: para mudar o rumo, edita-se a spec da mesma pasta, e a REQ-097 reconcilia o plano. A troca de pasta é só proteção. O usuário pediu a opção de adotar a pasta que mudou e deixou a mensagem a critério do implementador. O comportamento escolhido (plano vazio para o conjunto novo; o primeiro `save` descarta o plano antigo, inclusive os itens iniciados; as sessões ficam no histórico) só está no registro da task_04. Ele abre uma exceção à REQ-096 e cria um campo novo no contrato da §15 (`folderChange`). A spec precisa de um requisito novo (por exemplo REQ-097b), do texto da mensagem e do campo em `tasks.plan.get`, e, se o M-1 for corrigido, da recusa com sessão ativa.
2. **REQ-097:** registrar que o `stale` compara o grafo, e não o número da versão. Está pendente desde a review-001.
3. **§18:** aceitar ou não o cache de 10 s da leitura (`ReadAccessGate`). Pendente desde a review-001.

## Divergências entre o relatório do implementador e a evidência

Nenhuma. Os registros da correção da review-002 (tasks 04 e 08) conferem com o código, com as execuções e com as mutações desta sessão. O registro da task_04 declara que a regra contraria uma leitura estrita da REQ-096 e que precisa entrar na spec.

## Prompt de correção (opcional)

> Só se você quiser fechar o M-1. Corrija, sem alterar nada fora do listado. Siga `.agents/rules/code-standards.md` e a skill `software-testing`.
>
> 1. **M-1 (task_04 e task_06):**
>    - Em `packages/api/src/application/services/tasks-set/planSaveService.ts`: quando `resetItems` for verdadeiro e algum item do plano guardado tiver a sessão mais recente ativa (`isActiveSession(item.latestSession.status)`), recuse com uma razão nova, por exemplo `plan_previous_running`. Registre-a em `taskErrors.ts` e em `planErrorCatalog.ts`, com código `CONFLICT` e a mensagem "Uma sessão do plano anterior ainda está em andamento. Encerre-a antes de usar as novas tarefas.". Nada é gravado nesse caso.
>    - Em `planView.ts`: com `folderChange`, informe se há sessão do plano anterior em andamento (por exemplo `folderChange.running: boolean`). Em `apps/web/src/features/issues/assigned-work/components/PlanFolderChange.tsx`, mostre esse estado no aviso (texto em `planCopy.ts`) e desabilite "Usar as tarefas de …" enquanto ele valer.
>    - Testes:
>      - em `packages/api/test/plan-folder-change.test.ts`: item antigo com sessão `running`, depois `plan.save` → `plan_previous_running`, item e `plan_item_id` da sessão intactos, `plan.get` com `folderChange.running: true`;
>      - em `packages/api/test/plan-capture.test.ts` (ou num arquivo novo): a mesma situação, e uma edição sem skill de `docs/specs/login/task_01.md` vira versão `plano-de-execucao`;
>      - em `PlanFolderChange.test.tsx`: com `running: true`, o aviso cita a sessão em andamento e o botão fica desabilitado.
>
> Ao terminar, rode e mostre a saída de:
> - `pnpm --dir packages/api typecheck` e `pnpm --dir apps/web typecheck`;
> - `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/plan-folder-change.test.ts test/plan-capture.test.ts`;
> - `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/` e `pnpm --dir apps/web lint`;
> - no fim, `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`) e `pnpm --dir apps/web test`.
