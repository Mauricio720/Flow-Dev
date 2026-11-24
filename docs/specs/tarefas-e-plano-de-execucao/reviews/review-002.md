# Revisão de conformidade 002: Tarefas e plano de execução (Spec D) — PARCIAL

> **Data:** 2026-11-23 · **Escopo:** parcial, tasks 01 a 08, sem a task_09 (continua `in_progress`; o usuário não está rodando QA). Esta revisão cobre as correções da [review-001](review-001.md) e tudo o que elas tocaram. · **Intervalo:** árvore de trabalho sobre `HEAD` (`e88ea67`), sem commit
> **Spec:** `spec.md`, `_tasks.md`, `task_01.md` a `task_08.md` · **Regras lidas:** as mesmas da review-001 (`AGENTS.md`, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md`, `e2e-testing.md`, `layered-backend`, `trpc-nextjs`, `nextjs-folder-structure`, `software-testing`)

## Veredito: REPROVADO (parcial)

Nenhum bloqueante. As seis correções da review-001 estão no código e cobertas por testes que falham sem elas. O veredito fica REPROVADO por um importante que a própria correção do B-1 criou. Depois da troca de pasta, a tela continua oferecendo "Iniciar", que o servidor recusa com uma mensagem genérica. O único jeito de liberar o plano é salvar, mas "Salvar" fica desabilitado enquanto não houver edição. Se você aceitar esse risco, o veredito pode ser lido como "aprovado com ressalvas".

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 0 | 1 | 2 | 3 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `vitest run src/application/services/tasks-set/ src/application/services/projects/readAccessGate.test.ts src/application/services/terminal/` (api) | exit 0 · 24 arquivos, 204 testes | ✅ |
| `vitest run --config vitest.integration.config.ts` com `plan-folder-change`, `plan-save-concurrent`, `plan-save`, `plan-save-rules`, `plan-read`, `plan-capture`, `task-set-read`, `terminal-open-plan-item`, `terminal-open-plan-item-again` e `terminal-preflight-purpose` | exit 0 · 10 arquivos, 41 testes | ✅ |
| `plan-save-concurrent.test.ts` repetido 3 vezes | 2/2 nas três | ✅ (sem instabilidade observada) |
| `vitest run src/features/issues/assigned-work/` (web) | exit 0 · 53 arquivos, 277 testes | ✅ |
| `pnpm --dir packages/api typecheck` · `pnpm --dir apps/web typecheck` · `pnpm --dir apps/web lint` | exit 0 nos três | ✅ |
| Suítes completas, rodadas nesta sessão depois da última mudança de código | api 114 arquivos / 764 testes; integração 132 + 2 ignorados / 698 + 5 ignorados; web 97 / 489 | ✅ |
| `scan_diff.py --repo . --worktree --max-lines 100` | as mesmas pistas da review-001, já conferidas (`fixme` do V-41 na task_09, `console.log` do spike, asserções reescritas, `schema.ts` com 127 linhas, igual ao `HEAD`); nada novo | — |
| Mutações dirigidas, nesta sessão, durante a correção | sem `tasksFolder !== set.folder`: o caso unitário e o 1º teste de `plan-folder-change` falham; sem o `WHERE version`: o 1º de `plan-save-concurrent` falha; sem o `onConflictDoNothing`: o 2º falha; sem `conversation={conversation}`: o teste REQ-104 de `OperatorStages` falha. Código restaurado depois de cada uma (conferido por `grep`) | ✅ |

## Correções da review-001

| Achado | Status | Evidência |
|---|---|---|
| B-1 plano preso à pasta | ✅ no servidor · 🟡 na tela | `planReconciliation.ts:21`, `purposePlanItem.ts:17`; `plan-folder-change.test.ts` e o caso novo em `planReconciliation.test.ts`. A tela não acompanha (achado **I-1**) |
| I-1 concorrência no banco | ✅ | `plan-save-concurrent.test.ts`: versão 1 e versão 0, com o vencedor e o banco conferidos; sensível às duas mutações |
| I-2 "Ver a conversa" | ✅ (1 menor) | `OperatorStages.tsx:32-36`, `ExecutionStage.tsx:32`, `ExecutionHistory.tsx:25-29`; teste REQ-104 em `OperatorStages.test.tsx`. O foco fica gravado depois de usado (achado **M-1**) |
| M-1 `ReadAccessGate` | ✅ | `readAccessGate.ts:15-24`; `readAccessGate.test.ts` (4 testes, relógio injetado). O descarte não é observável pela API pública |
| M-2 log por poll | ✅ | `taskSetLoader.ts:28-34`; `taskSetLoader.test.ts` (3 testes); V-34p segue verde |
| M-3 textos em copy | ✅ | `planCopy.ts` (`blockedStateText`, `endedStateText`); `planStateModel.ts:21-22` |

## Regressão no que as correções tocaram

| Item | Status | Evidência |
|---|---|---|
| REQ-097 (reconciliação e aviso) | ✅ | Os casos antigos (V-35k, V-35l) continuam verdes, e a pasta divergente é o primeiro critério de `isStale` |
| REQ-100–102, REQ-105 (abertura do item) | ✅ | `terminal-open-plan-item*` e `terminal-preflight-purpose` verdes; a checagem nova vem antes de `reconcilePlan` e não muda os outros caminhos |
| REQ-098 / DEC-25 | ✅ | `plan-save.test.ts`, `plan-save-rules.test.ts` verdes |
| REQ-104 / histórico (V-40s, V-08q, V-08r) | ✅ | `ExecutionHistory.test.tsx` verde; sem foco, o item continua fechado |
| REQ-089 / V-34p | ✅ | O primeiro log continua igual |
| §18 leitura autorizada | ✅ | A recusa é propagada e não fica guardada (teste novo) |
| Regras do projeto nos arquivos tocados (100 linhas, 30 por função, sem comentários, parâmetros, constantes) | ✅ | O maior arquivo novo tem 55 linhas; a varredura própria não achou nada |

## Achados

### task_08 (consequência da correção do B-1 na task_04)

#### I-1 (Importante) — Depois da troca de pasta, a tela oferece "Iniciar", que o servidor recusa, e não deixa salvar sem editar
- **Onde:**
  - `apps/web/src/features/issues/assigned-work/components/PlanSaveBar.tsx:10`: `disabled={!state.dirty || state.saving}`;
  - `useExecutionPlan.ts`: `save()` sai cedo `if (!draft) return;`;
  - `ExecutionPlanEditor.tsx`: `canStart={canEdit && !state.dirty}` mostra "Iniciar" para itens que `loadItem` recusa (`purposePlanItem.ts:17`, `plan_item_not_ready` → "Esta sessão do plano não pode ser iniciada agora.").
- **Contra:**
  - REQ-097: o aviso fica "até o próximo salvamento", o que supõe que dá para salvar;
  - REQ-101: "Iniciar" numa sessão "Pronta" abre o diálogo;
  - REQ-100: o estado mostrado tem de corresponder ao que o servidor aceita.
- **Problema:**
  1. Depois de um `_tasks.md` em outra pasta, o plano mostra "As tarefas mudaram desde que o plano foi salvo. Revise o plano." e as sessões "Pronta" com "Iniciar".
  2. "Iniciar" abre o diálogo, e o `preflight` falha com a mensagem genérica, sem dizer o que fazer.
  3. "Salvar" continua desabilitado. Só uma edição qualquer, como "Mesmo modelo para todas" com a mesma escolha, habilita o botão.

  O plano fica travado para quem não descobre esse truque. O teste novo cobre só o servidor, e nenhum teste da tela passa por esse caminho.
- **Inferido da leitura;** nenhum teste exercita esse caminho na tela.
- **Correção esperada:**
  - com `view.stale`, "Salvar" fica habilitado mesmo sem rascunho e envia `toSaveInput(toEditable(view))`;
  - enquanto o plano é de outra pasta, os botões de iniciar não aparecem, o que pede um campo no `plan.get` (por exemplo `folderChanged`) ou outra regra combinada na spec;
  - um teste RTL: plano `stale` sem edição → "Salvar" habilitado, e o `save` chamado com a `version` lida.

### task_08 · task_04 (registro)

#### M-1 (Menor) — O foco da conversa fica gravado e reabre a sessão a cada volta à aba
- **Onde:** `OperatorStages.tsx:32` guarda `conversation` para sempre, e `StageTabs.tsx:28` remonta o painel a cada troca de aba (`key={active.id}`). O `HistoryItem` (`ExecutionHistory.tsx:26-29`) começa com `seenFocus = 0` e expande de novo a sessão focada sempre que a aba "Execução" volta a ser aberta.
- **Contra:** nada da spec. É um comportamento que ninguém pediu.
- **Correção esperada:** consumir o foco uma vez. Por exemplo, `ExecutionStage` avisa `OperatorStages` depois de expandir, e o foco volta a `null`. Teste: abrir pela "Ver a conversa", trocar de aba, voltar pela lista de abas → o item está fechado.

#### M-2 (Menor) — O registro da task_04 afirma mais do que a mutação mostrou
- **Onde:** `task_04.md`, registro da correção do B-1: "Sem a correção, os dois testes novos falham."
- **Evidência:** sem as duas linhas da correção, falharam o caso unitário novo e o 1º teste de `plan-folder-change.test.ts`. O 2º ("starts again after the plan is saved…") passa sem a correção, como era de esperar, porque ele prova o caminho de liberação e não o bloqueio.
- **Correção esperada:** reescrever a frase para dizer quais testes falham sem a correção.

## Atualizações de spec a discutir

1. **Sessões iniciadas do plano antigo depois da troca de pasta (continua da review-001).** Com a correção, o `save` regrava `tasks_folder`, e um item iniciado do plano antigo, cujos ids (`task_01`…) coincidem com os do conjunto novo, passa a valer para as tarefas novas. A prontidão, o "Iniciar de novo" e o prompt usam os arquivos da pasta nova, com a escolha antiga. Esse item também impede pôr essas tarefas em outra sessão (`plan_task_duplicated`). É preciso decidir: arquivar as sessões iniciadas do plano antigo, ou começar um plano novo por pasta.
2. **Texto do bloqueio por troca de pasta.** A spec não tem mensagem para "o plano é de outro conjunto de tarefas, salve de novo". Hoje sai a genérica de `plan_item_not_ready`. O I-1 precisa desse texto.
3. **Pendentes da review-001:** registrar na REQ-097 que o `stale` compara o grafo e não o número da versão, e aceitar ou não o cache de 10 s na leitura (§18).

## Divergências entre o relatório do implementador e a evidência

- `task_04.md`: "os dois testes novos falham" sem a correção. Só um dos dois testes de integração falha (M-2).
- Os demais registros das correções (tasks 02, 04, 05 e 08) conferem com o código e com as execuções desta sessão, incluindo os desvios declarados: `plan_item_not_ready` em vez de `task_set_unavailable`, a captura sem teste próprio e o descarte do cache sem teste.

## Prompt de correção

> Corrija, nesta ordem, sem alterar nada fora do listado. Siga `.agents/rules/code-standards.md` e a skill `software-testing`.
>
> 1. **I-1 (task_08):** em `apps/web/src/features/issues/assigned-work/`:
>    - com `view.stale`, "Salvar" (`PlanSaveBar.tsx`) fica habilitado mesmo sem rascunho, e `save()` (`hooks/useExecutionPlan.ts`) envia o plano lido (`toSaveInput(toEditable(view))`) com a `version` lida;
>    - enquanto o plano for de outra pasta, não mostre "Iniciar", "Iniciar mesmo assim" nem "Iniciar de novo". Exponha isso no `tasks.plan.get` (por exemplo `folderChanged: boolean`, calculado em `planView.ts` a partir de `plan.tasksFolder !== set.folder`), com teste em `packages/api/test/plan-folder-change.test.ts`;
>    - teste RTL: plano `stale` sem edição → "Salvar" habilitado e `tasks.plan.save` chamado com a versão lida; plano com `folderChanged: true` → nenhum botão de iniciar.
>
>    Se a spec ganhar um texto próprio para esse estado, use-o em `planCopy.ts`.
> 2. **M-1 (task_08):** consuma o foco da conversa uma única vez (`OperatorStages.tsx`, `ExecutionStage.tsx` e `ExecutionHistory.tsx`). Teste em `OperatorStages.test.tsx`: depois de "Ver a conversa", trocar para "Tarefas" e voltar a "Execução" pela lista de abas → o item do histórico está fechado.
> 3. **M-2 (task_04):** em `task_04.md`, troque "Sem a correção, os dois testes novos falham" por uma frase que diga quais testes falham sem a correção.
>
> Ao terminar, rode e mostre a saída de:
> - `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/`, `pnpm --dir apps/web typecheck` e `pnpm --dir apps/web lint`;
> - `pnpm --dir packages/api typecheck` e `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/plan-folder-change.test.ts test/plan-read.test.ts`;
> - no fim, `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`) e `pnpm --dir apps/web test`.
