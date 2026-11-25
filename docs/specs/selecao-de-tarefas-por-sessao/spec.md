# Mini-spec: Escolher várias tarefas para uma sessão do plano

> **Status:** Em revisão · **Data:** 2026-11-24 · **Nível:** L2 · **Issue:** #8
> **Onde:** só a tela do plano de execução, na aba "Tarefas" (`apps/web/src/features/issues/assigned-work/`).
> **Base:** [Spec D](../tarefas-e-plano-de-execucao/spec.md). Os IDs daqui começam em 001; os da Spec D levam o prefixo "D-".

## Problema

Hoje a sessão é escolhida **tarefa por tarefa**, no seletor "Sessão da tarefa NN" (`PlanTaskSessionSelect.tsx`). Montar uma sessão com 3 de 8 tarefas exige três trocas, e a primeira tem de ser "Nova sessão". O pedido original foi: "Melhorar a forma de escolher as tarefas na execução; Quero a possibilidade de selecionar mais de uma pra aquela sessão".

O resto já existe: cada sessão guarda de 1 a 30 tarefas (`task_session_plan_items.task_ids`). As pendências bloqueantes do planejamento partiram de `task_execution_plans` e `task_execution_plan_saves`, tabelas legadas da etapa CompozyOS removida. A Spec D já responde a cada uma:
- **ordem:** as dependências, dentro da sessão (D-REQ-095);
- **falha:** a sessão fica "Encerrada", com "Iniciar de novo" só para as tarefas não concluídas, e as sessões dependentes ficam bloqueadas (D-REQ-100, D-REQ-105);
- **workspace:** um clone e uma escolha de agente, modelo e esforço por sessão (D-REQ-092);
- **limite:** até 30 tarefas do mesmo conjunto (D-7.8).

## Comportamento desejado

- **REQ-001:** ENQUANTO a pessoa puder editar o plano (D-REQ-107), cada sessão não iniciada DEVE oferecer "Escolher tarefas", e o plano DEVE oferecer "Nova sessão".
- **REQ-002:** QUANDO a pessoa acionar uma delas, o sistema DEVE abrir o diálogo "Tarefas da Sessão N" ou "Tarefas da nova sessão". Ele lista todas as tarefas do conjunto na ordem do manifesto, cada uma com uma caixa de seleção "NN — Título" e o lugar atual: "Sem sessão", "Está na Sessão N" ou "Sessão N · iniciada".
- **REQ-003:** O diálogo DEVE abrir com marcadas exatamente as tarefas da própria sessão (nenhuma, em "Nova sessão") e com as de sessões iniciadas desabilitadas.
- **REQ-004:** QUANDO a pessoa acionar "Aplicar", a sessão DEVE ficar, no rascunho, com exatamente as tarefas marcadas, em ordem de número:
  - as desmarcadas vão para "Sem sessão";
  - as marcadas saem da outra sessão não iniciada em que estavam;
  - a sessão que ficar vazia, inclusive esta, sai do plano;
  - uma sessão iniciada nunca muda.
- **REQ-005:** QUANDO a pessoa acionar "Criar sessão" no diálogo de "Nova sessão", o rascunho DEVE ganhar, no fim do plano, uma sessão com as tarefas marcadas em Claude Code · Opus · Máximo (D-REQ-094), e elas saem de onde estavam, como na REQ-004.
- **REQ-006:** SE nenhuma tarefa estiver marcada no diálogo de "Nova sessão", ENTÃO "Criar sessão" DEVE ficar desabilitado.
- **REQ-007:** QUANDO a pessoa acionar "Cancelar" ou Esc, o diálogo DEVE fechar sem mudar o rascunho. Ao fechar por qualquer caminho, o foco DEVE voltar à ação que o abriu.
- **REQ-008:** O diálogo DEVE mudar só o rascunho. O plano DEVE continuar indo ao servidor apenas por "Salvar" (D-DEC-25).

## Comportamento que não muda

- DEVEM CONTINUAR como na Spec D:
  - o seletor "Sessão" por tarefa (decisão do usuário);
  - os três atalhos;
  - a escolha de agente, modelo e esforço por sessão;
  - a seção "Sem sessão";
  - o modo leitura, sem controles de edição, para quem não opera;
  - o uso do plano inteiro pelo teclado (D-NFR-17).
- Ao salvar, o servidor DEVE CONTINUAR a recusar com as mensagens de hoje (D-REQ-095, D-REQ-096, D-REQ-098):
  - a ordem inválida ("A tarefa 02 depende da 01, que está numa sessão posterior.");
  - a sessão iniciada alterada;
  - o conflito entre abas.
- As tarefas concluídas DEVEM CONTINUAR escolhíveis, como no seletor, e o prompt continua listando só as não concluídas.

## Decisões e onde mexer

- **DEC-01: só a tela muda.** O modelo já guarda várias tarefas por sessão, e o editor já monta e salva o plano inteiro (D-DEC-25). Assim, o início, os estados e o prompt de uma sessão continuam como na D-7.5 e na D-7.6.
  - Rejeitado: uma procedure "definir tarefas da sessão", que duplicaria a validação.
- **DEC-02: a lista abre num diálogo modal,** como o `TerminalLaunchDialog`, com o `useDialogFocus`.
  - Rejeitado: embutir a lista no cartão. Com ela aberta, outras edições mudariam as tarefas por baixo, e o "Aplicar" desfaria esses movimentos sem aviso.
  - Consequência: com o diálogo aberto, o resto do plano não é editável.
- **Onde:**
  - a regra das REQ-004 e REQ-005 vai para `planSelectionModel.ts`, um arquivo novo e puro, porque o `planEditorModel.ts` já usa 77 das 100 linhas;
  - o diálogo é o novo `PlanSessionTasksDialog.tsx`;
  - há ajustes em `PlanSessionCard.tsx`, `ExecutionPlanEditor.tsx`, `planEditHandlers.ts` e `planCopy.ts`.

## Critérios de aceite

Conjunto de teste (`apps/web/src/test/planEditor.tsx`): 01 Esquema, 02 Rotas (depende de 01), 03 Tela, 04 Docs.

1. **Dado** a Sessão 1 (01, 03) e a Sessão 2 (02, 04) não iniciadas, **quando** Ana aciona "Escolher tarefas" na Sessão 1, **então** vê 01 e 03 marcadas, e 02 e 04 desmarcadas com "Está na Sessão 2".
2. **Dado** esse diálogo, **quando** Ana desmarca 03, marca 04 e aplica, **então** a Sessão 1 mostra 01 e 04, a Sessão 2 mostra 02, e 03 vai para "Sem sessão". Nada vai ao servidor até "Salvar", que envia Sessão 1 = [task_01, task_04] e Sessão 2 = [task_02].
3. **Dado** as quatro tarefas sem plano, **quando** Ana aciona "Nova sessão", marca 01 e 02 e cria, **então** a Sessão 1 tem 01 e 02 em Claude Code · Opus · Máximo. Antes de marcar, "Criar sessão" estava desabilitado.
4. **Dado** a Sessão 1 (01) iniciada, **quando** Ana abre o diálogo de outra sessão, **então** 01 aparece desabilitada com "Sessão 1 · iniciada", e a Sessão 1 não oferece "Escolher tarefas".
5. **Dado** o diálogo aberto, **quando** Ana usa só Tab, Espaço e Esc, **então** marca e desmarca tarefas, e o Esc fecha sem mudança, com o foco de volta em "Escolher tarefas".
6. **Dado** Bruno, membro que só lê, **quando** abre o plano, **então** não vê "Escolher tarefas" nem "Nova sessão".

## Verificação

A base é a `software-testing`: a regra fica numa função pura, e a ligação é testada nos componentes reais.

- **V-01 · `planSelectionModel` puro (REQ-004 a REQ-006):** pega tarefa em duas sessões, sessão iniciada alterada, sessão vazia que sobra e chave repetida; confere que a sessão nova entra no fim, em Opus · Máximo.
- **V-02 · `ExecutionPlanEditor` com o diálogo real (RTL; tRPC simulado por `src/test/planEditor.tsx`):** cobre as REQ-001 a REQ-008 e os cenários 1 a 6. Confere o payload de `tasks.plan.save` no cenário 2 e, com `plan_invalid_order` simulado depois de "Aplicar", a mensagem do servidor.
- **V-03 · testes atuais, sem mudar asserções:** `planEditorModel`, `ExecutionPlanEditor`, `ExecutionPlanEditorReadOnly` e `PlanSessionCard` provam o que não muda.
- **V-04 · navegador, com um conjunto real:** uma sessão de duas tarefas montada pelo diálogo, a rolagem com 30 tarefas e o foco visível.
- **Sem teste novo de integração nem e2e:** o servidor não muda, e `e2e/task-plan.spec.ts` está em `test.fixme` porque depende da verificação do GitHub.

**Pronto quando:** `pnpm --dir apps/web test`, `pnpm --dir apps/web typecheck` e `pnpm lint` passam, e o V-04 foi conferido uma vez.

## Em aberto

Nada.

## Sugestões fora do escopo

- Mostrar no diálogo as dependências de cada tarefa e avisar já na seleção quando a ordem fica inválida, em vez de só ao salvar.
- Reordenar as sessões. A D-REQ-096 prevê isso, mas a tela não oferece, e "Nova sessão" sempre entra no fim.

## Histórico

- 2026-11-24: criação a partir da Issue #8. O nível é L2, e não PRD, porque o plano já guarda várias tarefas por sessão. Decisões do usuário:
  - a "tarefa" é a da spec-to-tasks, e não a feature;
  - a escolha é feita por uma lista na sessão;
  - o seletor por tarefa continua.
