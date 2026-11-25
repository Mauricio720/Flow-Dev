---
status: completed
title: Opção na prévia e resultado na tela
type: frontend
complexity: medium
---

# Task 04: Opção na prévia e resultado na tela

## Visão geral
Leva a feature à tela de autoria: a caixa "Atribuir a mim e colocar em Ready" na prévia, o envio de `assignToSelf`, as recusas M-1 a M-3 em alerta e o resultado R-0 a R-4 em `PublishedResult`, que troca de pendente para final na releitura periódica, sem recarregar.

<critical>
- LEIA a spec (`spec.md`, principalmente US-01 a US-03, RN-01, RN-05, RN-06 e NFR-03/NFR-04) e as regras do projeto (AGENTS.md, `apps/web/AGENTS.md`, `.claude/rules/code-standards.md`, `apps/web/DESIGN.md`) antes de começar. Use as skills `nextjs-folder-structure` e `trpc-nextjs`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-001 e RN-01: com a prévia pronta, a tela oferece a caixa "Atribuir a mim e colocar em Ready", desmarcada a cada prévia, sem lembrar a escolha entre tarefas.
- US-01 cenário 1: com a caixa marcada, "Criar Issue" envia `assignToSelf: true`; desmarcada, `false`.
- REQ-005, RN-05, NFR-04: as recusas `ready_board_missing`, `ready_status_missing` e `assign_permission_denied` aparecem com os textos M-1, M-2 e M-3 literais, num elemento com `role="alert"`.
- REQ-009 e US-02 cenário 4: depois da recusa, o draft continua igual e a pessoa pode refazer a prévia e criar sem a opção.
- REQ-012, REQ-013, REQ-014, RN-06, NFR-04: `PublishedResult` mostra R-0 a R-4 conforme `publication.readyAssignment.state`, num elemento com `role="status"`; com `readyAssignment === null`, não mostra nada novo.
- REQ-013 e NFR-03: R-0 é trocado pela mensagem final na próxima releitura (intervalo atual de 15 s para tarefa publicada), sem recarregar a página.
- REQ-015: não há botão para refazer a atribuição nem o Ready.
- Não muda (§9): a nota da reivindicação explícita (`WORK_NOTE`) e o link "Ir para Trabalho atribuído" continuam; o rodapé do draft se comporta como hoje.
- NFR-01: a tela nunca envia login nem id de conta.

## Interfaces
- **Consome:** `tasks.publish` com `assignToSelf: boolean` e `tasks.byId → publication.readyAssignment: null | { state: "pending" | "ready" | "not_assigned" | "ready_failed" | "unconfirmed" }` (task_02 e task_03), via `RouterOutputs` (`apps/web/src/features/issues/issue-composer/contract.ts`); os motivos novos de `TaskErrorReason` (task_03).
- **Produz:**
  - `PublishInput` (`publicationClient.ts`) com `assignToSelf: boolean`.
  - `usePublication` devolve também `assignToSelf: boolean` e `setAssignToSelf(value: boolean)`; `review()` volta a escolha para `false`.
  - `PublicationPreview` recebe `assignToSelf` e `onAssignToSelfChange`.
  - `READY_ASSIGNMENT_MESSAGE: Record<ReadyAssignmentState, string>` num arquivo de cópia da feature (`readyAssignmentCopy.ts`).

## Mini-tarefas

- [x] **04.1 — Caixa na prévia, envio da escolha e recusas M**
  - **Arquivos:** `apps/web/src/features/issues/issue-composer/components/PublicationPreview.tsx`, `apps/web/src/features/issues/issue-composer/hooks/usePublication.ts`, `apps/web/src/features/issues/issue-composer/publicationClient.ts`, `apps/web/src/features/issues/issue-composer/taskCopy.ts` (M-1 a M-3 em `REASON_MESSAGE`; tem 67 linhas, extraia para `publicationCopy.ts` se passar de 100), o componente que passa props a `PublicationPreview` (`DraftReview.tsx`), `apps/web/src/features/issues/issue-composer/components/PublicationPreview.test.tsx` (criar)
  - **Testes:** V-08a, V-08b, V-08c, V-08d
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/issue-composer/components/PublicationPreview.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros
  - **Nota:** use um `<input type="checkbox">` com `<label>` visível (ou o componente de checkbox de `@/components/ui`, se existir), operável por teclado. Confira também que a recusa do worker (`lastError.reason` com um dos três motivos, task volta a `draft_ready`) usa os mesmos textos pelo caminho atual de `lastError`; se não houver caminho, registre no Registro de execução em vez de inventar um.
- [x] **04.2 — Resultado da atribuição em `PublishedResult`**
  - **Arquivos:** `apps/web/src/features/issues/issue-composer/readyAssignmentCopy.ts` (criar, R-0 a R-4 literais), `apps/web/src/features/issues/issue-composer/components/PublishedResult.tsx` (56 linhas; se passar de 100, crie `ReadyAssignmentNotice.tsx`), `apps/web/src/features/issues/issue-composer/components/PublishedResult.test.tsx`, o teste de releitura do workspace que já avança 15 s (`apps/web/src/features/issues/issue-composer/hooks/useTaskWorkspace.test.tsx` ou `components/Workspace.states.test.tsx`, conforme onde a releitura já é provada)
  - **Testes:** V-09a, V-09b, V-09c, V-09d, V-11c
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/issue-composer/components/PublishedResult.test.tsx src/features/issues/issue-composer/components/DraftFooter.test.tsx` e o arquivo de releitura escolhido passam; `pnpm --dir apps/web typecheck` sem erros
  - **Nota:** os dublês de `TaskPublication` nos testes atuais (`@/test/...`) passam a precisar de `readyAssignment: null`; acrescente só isso. Use timers falsos do Vitest para os 15 s, como `useTaskWorkspace.test.tsx` já faz.

## Detalhes de implementação
Espelhe `PublishedResult.test.tsx` e `DraftFooter.test.tsx` (Testing Library, harness `@/test/workspaceHarness`, procedures tRPC simuladas). As mensagens são constantes nomeadas, nunca strings soltas no JSX. O estado `pending` é o único que muda sozinho; a tela não calcula os 2 minutos (o servidor devolve `unconfirmed`).

### Arquivos relevantes
- `apps/web/src/features/issues/issue-composer/components/PublicationPreview.tsx`: `PreviewFacts` ("Criada por") e o bloco de falha com `role="alert"`.
- `apps/web/src/features/issues/issue-composer/hooks/usePublication.ts`: `approve`, `review` e a chave do pedido (`keys.keyFor(\`${task.version}:${preview.previewHash}\`)`).
- `apps/web/src/features/issues/issue-composer/components/DraftOutcome.tsx`: onde `PublishedResult` é montado.
- `apps/web/src/features/issues/issue-composer/workspaceState.ts`: `pollInterval("published") === 15_000`.
- `apps/web/src/features/issues/issue-composer/taskCopy.ts:19,64`: `REASON_MESSAGE` e `failureMessage`.

### Arquivos afetados
- Ver "Arquivos" de cada mini-tarefa.

### Decisões relacionadas
- DEC-02 (spec §17): a opção não é desabilitada na prévia; a falta só aparece no clique.
- DEC-04 (spec §17): sem "Tentar de novo".

## Premissas
- A chave do pedido inclui a escolha (`${task.version}:${preview.previewHash}:${assignToSelf}`), para que marcar a caixa depois de um clique sem ela não reaproveite a mesma chave e caia em `request_key_reused` (B-01). Registre se o hook já trata isso de outro jeito.

## Testes atribuídos
- [x] V-08a: prévia pronta → existe `getByRole("checkbox", { name: "Atribuir a mim e colocar em Ready" })`, desmarcada; `Tab` chega nela e `Espaço` a marca · componente com procedures simuladas
- [x] V-08b: caixa marcada e "Criar Issue" → `publish.mutate` recebe `assignToSelf: true` e nenhuma chave `login`/`assignees`; sem marcar → `assignToSelf: false` · componente com procedures simuladas
- [x] V-08c: `publish` rejeitando com cada um dos três motivos → o texto M-1, M-2 ou M-3, literal da spec, aparece num `role="alert"`, e o draft continua visível e igual · componente com procedures simuladas
- [x] V-08d: marcar a caixa, pedir a prévia de novo (outra revisão ou "Tentar a prévia de novo") → a caixa volta desmarcada (RN-01, US-02 cenário 4) · componente com procedures simuladas
- [x] V-09a: `readyAssignment.state` `pending`, `ready`, `not_assigned`, `ready_failed` e `unconfirmed` → o texto R-0, R-1, R-2, R-3 e R-4 literal num `role="status"`; nenhum botão de refazer · componente
- [x] V-09b: `readyAssignment: null` → nenhum dos textos R aparece · componente
- [x] V-09c: `byId` devolve `pending` e, na releitura seguinte, `ready` → depois de avançar 15 s com timers falsos, R-0 some e R-1 aparece sem recarregar · workspace com procedures simuladas
- [x] V-09d: com qualquer estado, a nota "Publicar não inicia planejamento nem execução…" e "Ir para Trabalho atribuído" continuam · componente
- [x] V-11c: `DraftFooter.test.tsx` e `PublishedResult.test.tsx` atuais passam, mudando só os dados de dublê · testes existentes

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Textos M e R idênticos aos da spec (conferir por cópia, não por paráfrase).
- Typecheck de `apps/web` sem erros; nenhum arquivo acima de 100 linhas; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data · mini-tarefa · o que foi feito · comandos e resultado · desvios. -->
- 2026-11-25 · 04.1 · Caixa `AssignToSelfOption.tsx` (arquivo novo, extraído para manter `PublicationPreview.tsx` pequeno), `assignToSelf`/`setAssignToSelf` em `usePublication` (volta a `false` em `review()`), `assignToSelf` em `PublishInput`, M-1 a M-3 em `REASON_MESSAGE` e props em `DraftReview.tsx`. A chave do pedido passou a incluir a escolha (`version:previewHash:assignToSelf`), como na Premissa. `approve` passou a receber um objeto (`Approval`) para ficar em 3 parâmetros ou menos. A recusa do `publish` aparece no `role="alert"` do `PublicationPreview` (estado `failed`, com "Tentar a prévia de novo"); a recusa do worker usa o caminho atual de `lastError` em `TaskProgress` → `reasonMessage`, coberto por um teste novo em `TaskProgress.test.tsx` (V-06a, lado da tela).
  - Comandos: `pnpm --dir apps/web exec vitest run src/features/issues/issue-composer/components/PublicationPreview.test.tsx` → 6 passam; `pnpm --dir apps/web exec vitest run src/features/issues/issue-composer` → 28 arquivos, 139 testes passam; `pnpm --dir apps/web typecheck` sem erros.
  - Desvio: `readyAssignment: null` foi acrescentado em `src/test/tasks.ts` (`publishedDetail`) e em `publicationModel.test.ts` já aqui, porque o typecheck falhava sem isso (o contrato da 03 tornou o campo obrigatório). Era escopo previsto da 04.2.
- 2026-11-25 · 04.2 · `readyAssignmentCopy.ts` (`READY_ASSIGNMENT_MESSAGE`, R-0 a R-4 literais), `ReadyAssignmentNotice.tsx` (novo, `role="status"`, nada com `readyAssignment === null`) montado em `PublishedResult.tsx` (58 linhas), tipo `ReadyAssignmentState` em `contract.ts`. Testes V-09a, V-09b e V-09d em `PublishedResult.test.tsx`; V-09c em `PublishedResult.polling.test.tsx` (arquivo novo, com timers falsos e 15 s, porque `Workspace.states.test.tsx` tem 99 linhas e `useTaskWorkspace.test.tsx` não monta a tela). V-11c: `DraftFooter.test.tsx` e o `PublishedResult.test.tsx` original passam sem mudar asserções; os dublês ganharam `readyAssignment: null` (já feito na 04.1).
  - Comandos: `pnpm --dir apps/web exec vitest run src/features/issues/issue-composer/components/PublishedResult src/features/issues/issue-composer/components/DraftFooter.test.tsx` → 3 arquivos, 17 testes passam; `pnpm --dir apps/web exec vitest run src/features/issues` → 489 testes passam; `pnpm --dir apps/web typecheck` sem erros; `eslint src/features/issues/issue-composer src/test` sem saída.
  - Desvio: nenhum além do arquivo de teste novo acima.

