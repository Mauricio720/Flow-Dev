---
status: completed
title: Conversa na tela
type: frontend
complexity: high
---

# Task 06: Conversa na tela

## Visão geral
É a parte da tarefa que a pessoa usa:
- o diálogo de abertura ganha o modo de permissões e o bloqueio com o serviço fora do ar;
- a etapa vira "Sessão do Claude", com a conversa;
- os cartões de pergunta e de aprovação;
- o campo de mensagem e os controles Interromper e Encerrar.

Quem não controla a sessão vê tudo em leitura.

<critical>
- LEIA a spec (`docs/specs/sessao-no-flow-dev/spec.md`, §5, §6, §7.4, §7.5, §7.9–§7.11 e NFR-14), `apps/web/AGENTS.md`, `apps/web/DESIGN.md` e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use as skills `nextjs-folder-structure` e `trpc-nextjs` (lado cliente).
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-052, 7.11, US-08.1: o diálogo mostra "Tudo liberado" (padrão), "Aceitar edições, perguntar comandos" e "Perguntar tudo"; o botão de confirmar diz "Iniciar sessão".
- REQ-053, US-06.4: com `sessionService.running = false`, o diálogo mostra "O serviço de sessões do Flow Dev não está rodando. Inicie o Flow Dev com pnpm dev e tente de novo." e não mostra a confirmação.
- REQ-055, REQ-057, REQ-061: a etapa "Sessão do Claude" mostra as entradas da `timeline` em ordem, com o texto do Claude em Markdown (HTML escapado, NFR-09), consultando a cada 1,5 s com a sessão ativa; sessões anteriores mostram a conversa ao expandir.
- REQ-063, REQ-064, REQ-066, 7.9: o cartão de perguntas mostra título, texto, opções com descrição e prévia (Markdown em monoespaçado), escolha única ou múltipla e "Outra" (até 2.000 caracteres); "Enviar respostas" só fica habilitado com todas respondidas.
- REQ-067: as mensagens "Este pedido já foi respondido." e "Este pedido não está mais aberto." para `request_answered` e `request_closed`.
- REQ-069, REQ-070, 7.10: o cartão de aprovação mostra título e corpo, "Permitir", "Permitir sempre (<regra>)" só com regra sugerida, e "Recusar" com motivo opcional (até 2.000 caracteres).
- REQ-058: o campo de mensagem aceita de 1 a 20.000 caracteres e mostra "Na fila" nas mensagens sem entrega; "Não entregue" nas `undelivered`.
- REQ-073, REQ-074: "Interromper" aparece em Em andamento e Precisa de você; "Encerrar" pede a confirmação "Encerrar a sessão? O Claude para, e a conversa fica só para leitura.".
- REQ-075, REQ-080, B-22: sem `canControl` ou em estado final, nem campo nem controles; com `canControl: false` numa sessão ativa, a nota "Só quem abriu a sessão, enquanto for a operadora, pode responder.".
- B-28: sessões `runtime = terminal` aparecem como "Aberta no terminal", só com eventos e sem campo.
- REQ-081: sessão `flow_dev` em "Não confirmada" mostra "O Flow Dev não conseguiu iniciar o Claude. Confira se o serviço de sessões está rodando."; as sessões `terminal` mantêm a mensagem da Spec B.
- 7.2: rótulos "Precisa de você" (`asking`) e "Interrompida" (`interrupted`), com a nota da REQ-076 vinda da conversa.
- NFR-14: região `aria-live="polite"` para as entradas novas; cada pergunta é um `fieldset` com `legend` e botões de opção ou caixas de seleção; tudo pelo teclado; Ctrl+Enter envia e Enter quebra a linha.

## Interfaces
- **Consome:** `tasks.terminal.preflight` (`sessionService.running`), `tasks.terminal.open({ permissionMode })` e `tasks.session.timeline | send | answerQuestion | decidePermission | interrupt | end` (task_03, contratos da spec §15); `renderArtifactMarkdown` de `artifactMarkdown.ts`; `useTerminalLaunch`, `TerminalLaunchDialog` e `ExecutionStage` existentes.
- **Produz:** `useSessionTimeline(scope, session)`, `SessionConversation`, `QuestionRequestCard`, `PermissionRequestCard`, `SessionComposer`, `SessionControls` e os textos em `sessionCopy.ts`.

## Mini-tarefas

- [x] **06.1 — Diálogo: modo de permissões e serviço fora do ar**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/components/PermissionModeField.tsx` (criar), `TerminalLaunchDialog.tsx`, `TerminalLaunchBody.tsx`, `TerminalLaunchFooter.tsx`, `hooks/useTerminalLaunch.ts`, `terminalContract.ts`, `terminalCopy.ts` (alterar), `components/TerminalLaunchDialog.test.tsx` (alterar)
  - **Testes:** V-29a, V-29d
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/TerminalLaunchDialog.test.tsx src/features/issues/assigned-work/components/TerminalLaunchConfirm.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros
- [x] **06.2 — Linha do tempo, leitura e sessões antigas**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/hooks/useSessionTimeline.ts`, `sessionClient.ts`, `sessionContract.ts`, `sessionCopy.ts`, `components/SessionConversation.tsx`, `components/SessionEntry.tsx` (criar), `components/ExecutionStage.tsx`, `ExecutionStatus.tsx`, `ExecutionHistory.tsx`, `executionCopy.ts` (alterar), `components/SessionConversation.test.tsx` (criar)
  - **Testes:** V-28g, V-28h, V-28i
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/SessionConversation.test.tsx src/features/issues/assigned-work/components/ExecutionStage.test.tsx src/features/issues/assigned-work/components/ExecutionHistory.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros
- [x] **06.3 — Cartão de perguntas**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/components/QuestionRequestCard.tsx`, `QuestionField.tsx` (criar), `questionAnswerModel.ts` (criar), `components/QuestionRequestCard.test.tsx` (criar)
  - **Testes:** V-28a, V-28b, V-28c
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/QuestionRequestCard.test.tsx` passa
- [x] **06.4 — Cartão de aprovação**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/components/PermissionRequestCard.tsx`, `PermissionDenyForm.tsx` (criar), `components/PermissionRequestCard.test.tsx` (criar)
  - **Testes:** V-28d
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/PermissionRequestCard.test.tsx` passa
- [x] **06.5 — Campo de mensagem e controles**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/components/SessionComposer.tsx`, `SessionControls.tsx`, `SessionEndConfirm.tsx` (criar), `hooks/useSessionActions.ts` (criar), `components/SessionComposer.test.tsx` e `SessionControls.test.tsx` (criar)
  - **Testes:** V-28e, V-28f
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/SessionComposer.test.tsx src/features/issues/assigned-work/components/SessionControls.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros

## Detalhes de implementação
- O `ExecutionStage` continua lendo a sessão mais recente de `tasks.byId`. Para `runtime = flow_dev`, a conversa vem do `useSessionTimeline`, que pede só o que veio depois do `cursor` e acumula as entradas. A lista de eventos da Spec B continua para `runtime = terminal`.
- `TERMINAL_POLL_MS` (3 s, `workState.ts`) continua para o resto do detalhe; o polling de 1,5 s é só da `timeline` e para em estado final.
- Envios usam `requestKey` gerado uma vez por envio (`crypto.randomUUID()`), reaproveitado num reenvio.
- O foco preso e o Esc da confirmação de encerrar reaproveitam `useDialogFocus` (`apps/web/src/hooks/`), como o diálogo de abertura.
- O Markdown do Claude usa `renderArtifactMarkdown`, que já escapa o HTML cru. A prévia de opção usa o mesmo renderizador dentro de um bloco monoespaçado.
- Siga `apps/web/DESIGN.md` para o visual; não crie um sistema de cores novo.

### Arquivos relevantes
- `components/TerminalLaunchDialog.tsx`, `TerminalSessionConfirm.tsx` e `hooks/useTerminalLaunch.ts`: diálogo e confirmação existentes.
- `components/ArtifactViewer.tsx` e `artifactMarkdown.ts`: renderização segura de Markdown.
- `components/ExecutionEventList.tsx`, `ExecutionStatus.tsx` e `executionModel.ts`: estado e eventos da Spec B.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-17 (spec §17): polling da `timeline` a 1,5 s.
- NFR-09 (Spec B): HTML escapado.

## Premissas
Nenhuma.

## Testes atribuídos
- [x] V-29a: o diálogo abre → os três modos aparecem, "Tudo liberado" vem selecionado, e confirmar chama `open` com `permissionMode: "bypass"`; escolher "Perguntar tudo" e confirmar → `permissionMode: "ask_all"`; o botão diz "Iniciar sessão" · componente (RTL), cliente tRPC simulado
- [x] V-29d: `preflight` com `sessionService.running: false` → o diálogo mostra a mensagem exata do US-06.4 e nenhum botão "Iniciar sessão" · componente (RTL)
- [x] V-28g: sessão `asking` com `canControl: false` → nem campo, nem botões dos cartões, nem Interromper e Encerrar, e aparece a nota da B-22; sessão `ended` com `canControl: true` → conversa visível, sem campo nem controles (REQ-075) · componente (RTL)
- [x] V-28h: sessão `runtime = terminal` no histórico → "Aberta no terminal", a lista de eventos da Spec B e nenhum campo de mensagem · componente (RTL)
- [x] V-28i: uma entrada nova chega na `timeline` → aparece dentro da região `aria-live="polite"`; a nota de "Interrompida" e os rótulos "Precisa de você" e "Interrompida" aparecem pelo status; sessão `flow_dev` `unconfirmed` → a mensagem exata da REQ-081, e sessão `terminal` `unconfirmed` → a mensagem da Spec B · componente (RTL)
- [x] V-28a: pedido com "Quem pode ver os comentários?" e as opções "Só membros (Recomendado)" e "Qualquer pessoa", com descrições → um `fieldset` com essa `legend`, dois botões de opção com as descrições e "Outra"; escolher "Outra" e digitar "Só o autor e os administradores" → `answerQuestion` recebe `{ labels: [], other: "Só o autor e os administradores" }` · componente (RTL)
- [x] V-28b: duas perguntas, a segunda de escolha múltipla → com só a primeira respondida, "Enviar respostas" fica desabilitado; marcar duas caixas na segunda habilita o envio, que manda as duas respostas; `request_answered` mostra "Este pedido já foi respondido." · componente (RTL)
- [x] V-28c: opção com `preview` "```\nA | B\n```" → a prévia aparece num bloco monoespaçado; `<script>` na prévia aparece como texto · componente (RTL)
- [x] V-28d: pedido Bash com título "Rodar comando:", corpo "pnpm test" e `suggestedRule = "Bash(pnpm test:*)"` → três botões, "Permitir sempre (Bash(pnpm test:*))" incluído, e cada um manda a `decision` certa; sem `suggestedRule` → só "Permitir" e "Recusar"; "Recusar" com "Não apague o build, só rode o lint" → `decidePermission({ decision: "deny", reason })`; motivo de 2.001 caracteres → envio bloqueado com o limite · componente (RTL)
- [x] V-28e: digitar "Rode também o lint" e Ctrl+Enter → `send` chamado com esse texto e um `requestKey`; Enter → quebra de linha, sem enviar; vazio ou 20.001 caracteres → envio desabilitado com o limite; mensagem com `queued: true` → "Na fila"; com `undelivered: true` → "Não entregue" · componente (RTL)
- [x] V-28f: sessão `running` → "Interromper" chama `interrupt`; sessão `waiting` → sem "Interromper"; "Encerrar" abre a confirmação com o texto exato da REQ-074, Esc fecha sem chamar `end`, e confirmar chama `end` · componente (RTL)

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `pnpm --dir apps/web test` passando ao fim da tarefa.
- `pnpm --dir apps/web typecheck` e `pnpm --dir apps/web lint` sem erros; textos exatamente como na spec.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->

### 2026-11-23 — 06.1 Diálogo: modo de permissões e serviço fora do ar
- O diálogo agora é "Iniciar a sessão do Claude": `PermissionModeField` (grupo "Modo de permissões" com "Tudo liberado" marcado, "Aceitar edições, perguntar comandos" e "Perguntar tudo", cada um com a descrição da 7.11), o botão de confirmar e o gatilho dizem "Iniciar sessão", e `useTerminalLaunch` guarda o modo e o envia no `open` (`permissionMode`, padrão `bypass`). Com `preflight.sessionService.running = false`, o corpo mostra a mensagem exata do US-06.4 e o rodapé não oferece a confirmação nem a escolha do modo. O texto de `terminal_disabled` vem do servidor e continuou o mesmo (a trava `FLOW_DEV_TERMINAL_ENABLED` não mudou).
- Textos trocados: "Abrindo…" virou "Iniciando…", a falha de abertura fala em iniciar a sessão, e o aviso da decisão aprovada diz "Sessão iniciada por …" (era "Execução aberta no terminal por …").
- `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/TerminalLaunchDialog.test.tsx src/features/issues/assigned-work/components/TerminalLaunchConfirm.test.tsx`: passa, e o `TerminalLaunchMode.test.tsx` novo cobre o V-29a e o V-29d (4 testes). Os outros testes do diálogo só tiveram os rótulos atualizados.

### 2026-11-23 — 06.2 Linha do tempo, leitura e sessões antigas
- `sessionContract.ts` (tipos inferidos do contrato da API), `sessionClient.ts`, `sessionCopy.ts`, `sessionTimelineModel.ts` (mescla por `id`, 200 entradas, `nextPoll`), `hooks/useSessionTimeline.ts`, `hooks/useSessionActions.ts`, `SessionConversation.tsx` e `SessionEntry.tsx`. O Markdown do Claude usa o `renderArtifactMarkdown` (HTML escapado) e a moldura que o `ArtifactViewer` já tinha, agora em `markdownFrame.ts`.
- Polling: a cada 1,5 s com a sessão ativa, só com o `cursor`; as entradas que mudaram (pedido respondido, mensagem entregue) trocam a antiga pelo mesmo `id`, e as 200 mais recentes ficam na tela. Quando a sessão vira final, o hook busca a conversa inteira uma vez (para pegar o que só mudou na hora do fim, como "Não entregue") e para. Falha de rede mostra "Não foi possível atualizar a conversa agora. Tentando de novo." e mantém o que estava na tela. Os eventos da Spec B entram na conversa como linhas curtas.
- `ExecutionStage` vira "Sessão do Claude" e usa a conversa para `runtime = flow_dev`; para `terminal`, mostra "Aberta no terminal" com os eventos, sem campo. O histórico expande a conversa de uma sessão `flow_dev` anterior (só então busca) e marca as antigas como "Aberta no terminal". `sessionStatusLabel` ganhou a mensagem da REQ-081 para `flow_dev` não confirmada e "Aguardando a pessoa operadora" também em "Precisa de você" para quem só lê.
- Testes: `SessionConversation.test.tsx` (V-28g, V-28i, polling, fim da sessão, falha de rede), `ExecutionStageSessions.test.tsx` (V-28h, V-28i, REQ-081, histórico) e `sessionTimelineModel.test.ts` passam. Ajustei dois testes que afirmavam textos que a spec manda trocar: o rótulo da etapa ("Sessão do Claude") em `executionModel.test.ts` e a nota "Sessão iniciada por…" em `PlanningDecisionView.test.tsx`.

### 2026-11-23 — 06.3 Cartão de perguntas
- `QuestionRequestCard`, `QuestionField` (um `fieldset` com `legend` e botões de opção ou caixas de seleção, mais "Outra" com texto de até 2.000 caracteres), `QuestionOption` (descrição e prévia em Markdown escapado, em bloco monoespaçado), `QuestionSummary` (respondida, cancelada ou aguardando a pessoa operadora) e `questionAnswerModel.ts`. "Enviar respostas" só habilita com todas as perguntas respondidas e sem "Outra" vazia ou acima do limite; o erro do servidor (por exemplo "Este pedido já foi respondido.") aparece no cartão.
- `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/QuestionRequestCard.test.tsx`: 8 testes passam (V-28a, V-28b, V-28c, estados de leitura).

### 2026-11-23 — 06.4 Cartão de aprovação
- `PermissionRequestCard`, `PermissionDenyForm` e `PermissionSummary`: título e corpo do pedido (bloco monoespaçado), "Permitir", "Permitir sempre (<regra>)" só com regra sugerida e "Recusar", que abre o motivo opcional (até 2.000 caracteres, com o limite dito) e o botão "Enviar recusa". Decidido, mostra o resultado e o motivo; cancelado, "Cancelada".
- `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/PermissionRequestCard.test.tsx`: 7 testes passam (V-28d e mais).

### 2026-11-23 — 06.5 Campo de mensagem e controles
- `SessionComposer` (Ctrl+Enter ou Cmd+Enter envia, Enter quebra a linha, 1 a 20.000 caracteres com contador, `requestKey` gerado uma vez e reaproveitado até o envio dar certo), `SessionControls` ("Interromper" em Em andamento e Precisa de você; "Encerrar" sempre) e `SessionEndConfirm` (diálogo com `useDialogFocus`: foco preso, Esc fecha sem encerrar, o texto exato da REQ-074 e o botão "Encerrar sessão").
- Desvio de rótulo: o botão que confirma o encerramento chama-se "Encerrar sessão", para não repetir o "Encerrar" do gatilho (nome acessível único dentro do diálogo e na tela).
- `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/SessionComposer.test.tsx src/features/issues/assigned-work/components/SessionControls.test.tsx`: 16 testes passam (V-28e, V-28f e mais).

### 2026-11-23 — Fechamento da tarefa
- `pnpm --dir apps/web test`: 83 arquivos, 416 testes passam. `pnpm --dir apps/web typecheck` e `pnpm --dir apps/web lint`: sem erros nem avisos. Nenhum arquivo novo ou alterado passa de 100 linhas.
- Desvio: dois testes que já falhavam antes desta tarefa (`AgentSettings.test.tsx` e `ProjectSettings.test.tsx`, que esperavam só o botão "Salvar pasta" enquanto a tela já tem "Procurar…") foram corrigidos para a tela atual; não têm relação com a sessão.

### 2026-11-23 — Correção da review-001 (I-1, I-3, I-5)
- **I-1 (REQ-063):** cada pergunta mostra o título curto e o tipo de escolha ("Visibilidade · Escolha uma opção", "Verificações · Escolha uma ou mais opções"); teste em `QuestionRequestCard.test.tsx`.
- **I-3 (V-28e):** teste de que uma mensagem `undelivered: true` mostra "Não entregue" e não "Na fila".
- **I-5:** `useSessionTimeline` ficou com 20 linhas (a lógica do polling está em `sessionPolling.ts`, testada pelos testes de `SessionConversationPolling.test.tsx`); os testes da conversa foram divididos em dois arquivos de até 100 linhas.
- Verificação: `pnpm --dir apps/web test` (84 arquivos, 418 testes), `typecheck` e `lint` passam.
