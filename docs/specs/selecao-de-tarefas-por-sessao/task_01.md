---
status: completed
title: Regra pura de escolher tarefas da sessão
type: frontend
complexity: medium
---

# Task 01: Regra pura de escolher tarefas da sessão

## Visão geral
Esta tarefa cria `planSelectionModel.ts`, um módulo puro que aplica ao rascunho do plano a escolha feita no diálogo. Ele cobre duas operações: definir as tarefas de uma sessão existente e criar uma sessão nova com as tarefas marcadas. Também informa onde cada tarefa está, para o diálogo mostrar esse lugar. É o contrato que a Task 02 consome. Aqui não muda nenhuma tela.

<critical>
- LEIA a spec (`docs/specs/selecao-de-tarefas-por-sessao/spec.md`) e as regras do projeto (`AGENTS.md`, `.claude/rules/code-standards.md`) antes de começar. A spec D (`docs/specs/tarefas-e-plano-de-execucao/spec.md`) é a base; os IDs "D-" vêm dela.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`.claude/skills/software-testing/SKILL.md`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-004 (regra): ao aplicar, a sessão DEVE ficar com exatamente as tarefas marcadas, em ordem de número. As desmarcadas vão para "Sem sessão", e as marcadas saem da outra sessão não iniciada em que estavam. A sessão que ficar vazia, inclusive a própria, sai do plano. Uma sessão iniciada nunca muda.
- REQ-005 (regra): criar uma sessão DEVE acrescentá-la no fim do plano, com as tarefas marcadas, em `DEFAULT_CHOICE` (Claude Code · Opus · Máximo, D-REQ-094). As tarefas saem de onde estavam, pela mesma regra da REQ-004.
- REQ-006 (regra): sem tarefa marcada, criar uma sessão NÃO DEVE mudar o plano. A Task 02 desabilita o botão, e a função também se protege.
- DEC-01: só a tela muda. Nenhuma procedure, contrato de API ou validação de servidor é alterada.
- Não muda: `planEditorModel.ts` mantém o comportamento atual. A única mudança permitida é exportar `nextKey`, e os testes de `planEditorModel.test.ts` continuam sem alteração de asserção (V-03).

## Interfaces
- **Consome:**
  - `EditablePlan`, `EditableItem` de `apps/web/src/features/issues/assigned-work/planContract.ts`;
  - `DEFAULT_CHOICE` de `launchPurposeModel.ts`;
  - `nextKey(plan: EditablePlan): string` de `planEditorModel.ts`, hoje privado. Passa a ser exportado, sem mudar o corpo.
- **Produz** (em `apps/web/src/features/issues/assigned-work/planSelectionModel.ts`):
  - `export type TaskPlace = { kind: "none" } | { kind: "item"; key: string; position: number; started: boolean }`, em que `position` é `índice + 1` em `plan.items`, a mesma numeração de `sessionTitle`;
  - `export function placeOf(plan: EditablePlan, taskId: string): TaskPlace`;
  - `export function setSessionTasks(plan: EditablePlan, input: { key: string; taskIds: string[] }): EditablePlan`;
  - `export function createSessionWith(plan: EditablePlan, taskIds: string[]): EditablePlan`.

## Mini-tarefas

- [x] **01.1 — `setSessionTasks` e `placeOf` com testes**
  - **Arquivos:**
    - `apps/web/src/features/issues/assigned-work/planSelectionModel.ts` (criar);
    - `apps/web/src/features/issues/assigned-work/planSelectionModel.test.ts` (criar);
    - `apps/web/src/features/issues/assigned-work/planEditorModel.ts` (só exportar `nextKey`).
  - **Testes:** V-01a, V-01b, V-01c, V-01d, V-01e, V-01f, V-01g
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/planSelectionModel.test.ts src/features/issues/assigned-work/planEditorModel.test.ts` passa.
- [x] **01.2 — `createSessionWith` com testes**
  - **Arquivos:** `planSelectionModel.ts`, `planSelectionModel.test.ts` (os mesmos de 01.1).
  - **Testes:** V-01h, V-01i, V-01j, V-01k
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/planSelectionModel.test.ts` passa, e `pnpm --dir apps/web typecheck` não mostra erros.

## Detalhes de implementação
- Siga o estilo de `planEditorModel.ts`: funções pequenas, imutáveis, que retornam um `EditablePlan` novo e devolvem o mesmo `plan` quando a operação não se aplica.
- Uma forma direta de `setSessionTasks`:
  1. devolver `plan` se a chave não existe ou se a sessão está iniciada;
  2. filtrar de `input.taskIds` as tarefas de sessões iniciadas e remover as repetições;
  3. tirar essas tarefas de todas as outras sessões não iniciadas;
  4. pôr na sessão alvo a lista ordenada;
  5. remover as sessões não iniciadas que ficaram vazias.
- A ordem "de número" segue o que `moveTask` já faz (`.sort()` sobre `task_NN`, com zero à esquerda).
- `createSessionWith` reaproveita a mesma limpeza (tirar das outras sessões não iniciadas e descartar as vazias). Depois acrescenta no fim `{ key: nextKey(plan), taskIds, choice: DEFAULT_CHOICE, started: false }`.
- O arquivo deve ficar com menos de 100 linhas, e cada função com no máximo 30. Não use comentários.

### Arquivos relevantes
- `apps/web/src/features/issues/assigned-work/planEditorModel.ts`: `nextKey`, `without`, `moveTask` e `rebuilt` mostram o padrão. O arquivo tem 77 linhas, por isso a regra nova vai para um arquivo próprio (spec, "Onde").
- `apps/web/src/features/issues/assigned-work/planEditorModel.test.ts`: formato dos testes e dos planos de exemplo.
- `apps/web/src/features/issues/assigned-work/planContract.ts`: tipos `EditablePlan` e `EditableItem`.

### Arquivos afetados
- `planSelectionModel.ts` e `planSelectionModel.test.ts`: novos.
- `planEditorModel.ts`: `function nextKey` passa a `export function nextKey`.

### Decisões relacionadas
- DEC-01: a regra vive no cliente, sobre o rascunho, e o servidor continua validando ao salvar (D-DEC-25).

## Premissas
- "Chave repetida", citada na V-01, foi lida de duas formas, e as duas ganham teste:
  - a sessão nova não repete a chave de uma sessão nova que já existe (V-01k);
  - uma tarefa repetida na entrada aparece uma vez só (V-01f).
- Uma chave de sessão que não existe mais deixa o plano igual (V-01g). Isso acontece se o plano for relido entre abrir o diálogo e aplicar.

## Testes atribuídos
Planos de exemplo com as tarefas `task_01` a `task_04`; "S1(01,03)" quer dizer uma sessão de chave S1 com `task_01` e `task_03`. Fronteira: função pura, sem dublês.
- [x] V-01a: S1(01,03) e S2(02,04), ambas não iniciadas; `setSessionTasks(S1, [04, 01])` → S1 = [01, 04] e S2 = [02]. A 03 não fica em nenhuma sessão, e as escolhas de agente não mudam.
- [x] V-01b: S1(01) e S2(02), não iniciadas; `setSessionTasks(S1, [02, 01])` → S1 = [01, 02], e S2 sai do plano por ter ficado vazia.
- [x] V-01c: S1(01,03), não iniciada; `setSessionTasks(S1, [])` → S1 sai do plano.
- [x] V-01d: S1(01) iniciada e S2(02); `setSessionTasks(S1, [01, 03])` → o plano volta igual, a mesma referência.
- [x] V-01e: S1(01) iniciada e S2(02); `setSessionTasks(S2, [01, 02])` → S1 continua com [01], e S2 fica com [02].
- [x] V-01f: S1(01); `setSessionTasks(S1, [03, 01, 03])` → S1 = [01, 03], sem a 03 repetida.
- [x] V-01g: `setSessionTasks` com uma chave que não existe → o plano volta igual. Também aqui, `placeOf`: em S1(01) iniciada e S2(02), a 01 dá `{ kind: "item", key: S1, position: 1, started: true }`, a 02 dá `position: 2, started: false`, e a 04 dá `{ kind: "none" }`.
- [x] V-01h: S1(01,03) e S2(02); `createSessionWith([03, 02])` → S1 = [01], S2 sai do plano, e a sessão nova entra por último com [02, 03], `started: false`, a escolha `DEFAULT_CHOICE` (Claude Code · Opus · Máximo) e nenhum `id`.
- [x] V-01i: plano vazio; `createSessionWith([01, 02])` → uma sessão [01, 02] em Opus · Máximo (cenário 3 da spec).
- [x] V-01j: `createSessionWith([])` → o plano volta igual (REQ-006). Com S1(01) iniciada, `createSessionWith([01, 02])` → a nova sessão fica só com [02], e S1 não muda.
- [x] V-01k: o plano tem uma sessão nova `new-1`, ainda não salva; `createSessionWith([04])` → a chave da nova sessão é diferente de `new-1` e de todas as chaves existentes.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando, e `planEditorModel.test.ts` passando sem mudança de asserção.
- `planSelectionModel.ts` com menos de 100 linhas e sem comentários.
- `pnpm --dir apps/web typecheck` sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data · mini-tarefa · o que foi feito · comandos e resultado · desvios. -->
- 2026-11-24 · 01.1 · `planSelectionModel.ts` com `placeOf` e `setSessionTasks`, testes V-01a a V-01g em `planSelectionModel.test.ts`, e `nextKey` exportada em `planEditorModel.ts` (só o `export`). · `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/planSelectionModel.test.ts src/features/issues/assigned-work/planEditorModel.test.ts` → 2 arquivos, 18 testes passando. · Sem desvios.
- 2026-11-24 · 01.2 · `createSessionWith` em `planSelectionModel.ts` (49 linhas), testes V-01h a V-01k em `planSelectionModel.test.ts` (98 linhas). · `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/planSelectionModel.test.ts` → 13 testes passando; `pnpm --dir apps/web typecheck` sem erros. · Sem desvios. Tarefa 01 concluída: critérios de sucesso comprovados pelos comandos acima (sem comentários, arquivos abaixo de 100 linhas, `planEditorModel.test.ts` passando sem mudança de asserção).
