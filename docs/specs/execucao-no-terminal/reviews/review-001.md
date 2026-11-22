# Revisão de conformidade 001: Abrir a execução no terminal (Spec A)

> **Data:** 2026-11-22 · **Escopo:** feature inteira (revisão final, 7/7 tarefas `completed`, 27/27 mini-tarefas) · **Intervalo:** mudanças não commitadas sobre `main` (`a7f359e`), 183 arquivos
> **Spec:** `docs/specs/execucao-no-terminal/spec.md`, `_tasks.md`, `task_01.md`–`task_07.md`, `v00-spike.md`
> **Regras lidas:** `CLAUDE.md` → `AGENTS.md`, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md`, `.agents/rules/e2e-testing.md`, skills `layered-backend`, `trpc-nextjs`, `nextjs-folder-structure`

## Veredito: REPROVADO

O núcleo está bem feito e bem testado. O comando sem shell é idêntico ao do spike. A idempotência resiste a concorrência, a falha no disparo é registrada e as permissões ficam no servidor. As três suítes passam com as contagens declaradas. A reprovação vem de um defeito visível nos anexos: os envios de um diálogo fechado continuam valendo no servidor e bloqueiam o mesmo arquivo, ou qualquer arquivo depois de 10 envios, por até 24 h, sem como desfazer pela tela. Há ainda o limite de 30 MB com as imagens da Issue, que só é aplicado na confirmação, o smoke V-10b, que não passou pela UI apesar de marcado, e violações das regras de tamanho.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 1 | 5 | 2 | 4 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm typecheck` | exit 0 | ✅ |
| `pnpm lint` | exit 0 | ✅ |
| `pnpm --dir packages/api test` | exit 0 · 86 arquivos, 564 passed | ✅ |
| `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`) | exit 0 · 77 arquivos, 460 passed | ✅ |
| `pnpm --dir apps/web test` | exit 0 · 64 arquivos, 320 passed | ✅ |
| `scan_diff.py --worktree --max-lines 100` | 183 arquivos; sem dependências novas; 5 arquivos > 100 linhas; 1 `test.fixme`; 1 `mock-in-source`; 1 `hollow-assertion` | 3 hints confirmados (fixme, tamanhos), 2 descartados (o lançador falso é intencional e protegido por `NODE_ENV`; `not.toBeNull()` em `terminal-open.test.ts:52` vem junto de `launchError: "sem display"` na linha 51) |
| Mapeamento dos IDs de teste atribuídos | 93 IDs nas tasks; todos têm teste com o nome, exceto os manuais V-00a–e e V-10b | ✅ |
| `pnpm build` | **não executado**: há um `next dev` do usuário rodando em `apps/web` (pid 44863), e o build escreveria em `apps/web/.next` por baixo dele | ⚠️ sem evidência própria |
| `pnpm --dir apps/web test:e2e terminal-execution.spec.ts` | **não executado**: exige banco descartável e servidor com as variáveis de e2e; o V-10a está `test.fixme` de qualquer forma | ⚠️ sem evidência própria |

O Registro de execução da 07.2 afirma que `pnpm build` passou e que o e2e deu "2 passed, 1 skipped". Não confirmei nenhum dos dois nesta sessão.

## Conformidade com a spec

| Item | Status | Evidência |
|---|---|---|
| REQ-001, REQ-004, US-01.3 | ✅ | `localCheckoutService.ts:33-51`, DAO filtrado por `userId` (`drizzleLocalCheckoutDao.ts:31-33`) · `local-checkout.test.ts`, e2e E2E-011 |
| REQ-002, REQ-003, §7.1, US-01.1–2, B-02, B-08 | ✅ | `localCheckoutService.ts:53-61`, `localCheckoutRules.ts`, `localCheckoutErrorMapper.ts:10-17` (mensagens exatas) · `localCheckoutRules.test.ts` V-01b/h, `git-checkout-inspector.test.ts` |
| REQ-005, B-01, B-04, §7.4 | ✅ | Servidor: `terminalSessionController.ts:35,47` (`requireOperate`), DTO `planningDtoMapper.ts:32` (`canOpenTerminal` só com `approved`) · UI: `PlanningActions.tsx:47` · `terminal-open-guards.test.ts` V-03k |
| REQ-006, REQ-008, REQ-009, B-03, US-02.1/4/5 | ✅ | `TerminalCheckoutSummary.tsx`, `terminalCopy.ts:7-8,18-20`; confirmação só com checkout (`TerminalLaunchDialog.tsx:47`) · `TerminalLaunchDialog.test.tsx` |
| REQ-007, REQ-037, §7.3, B-16 | ✅ | `terminalPromptBuilder.ts:38-50`, `terminalPromptCopy.ts:5-12` · `terminalPromptBuilder.test.ts` V-02a–g |
| REQ-010, NFR-01, B-09, DEC-01, DEC-05 | ✅ | `terminalCommand.ts:12-16` (ordem exata do spike), `gnomeTerminalLauncher.ts:16` (`shell: false`, `detached`, ambiente filtrado), a pasta vem do banco e é revalidada (`terminalOpenGuard.ts:35-44`) · `terminal-open.test.ts:17-30` (args exatos com aspas, `$()`, crase e `--help`) |
| REQ-011, REQ-012, REQ-013, REQ-038, Q-01 | ✅ | `terminalOpenGuard.ts:27-65`, `terminalErrorCatalog.ts:31-46` · `terminal-open-guards.test.ts` V-03d–h, V-03l |
| REQ-015 | ✅ | `terminalSessionWrites.ts:25-32` (`ON CONFLICT DO NOTHING` + reaproveitamento do `launch_failed`) · `terminal-open.test.ts:32-42` (sequencial e 3 concorrentes, uma linha e uma janela) |
| REQ-040, §16 passo 6, `launch_failed` | ✅ | `terminalOpenSteps.ts:36-42`, `terminalLastOpened.ts:7` (ignora falhas), `PlanningDecisionView.tsx:32` · `terminal-open.test.ts:44-69` |
| REQ-025, V-11a | ✅ | `issueDeletionWorker.ts:169`, `terminalTaskFilesPurger.ts`, `deletionPurge.ts:32-33` · `issue-deletion-purge.test.ts` V-11a (linhas e arquivos) |
| REQ-027, REQ-029, §7.6, B-13, NFR-06 | ✅ | `attachmentRules.ts:42-51`, `attachmentSignatures.ts`, `diskAttachmentFileStore.ts` (`0700`/`0600`, nome gerado), rota com mesma origem (`route.ts:10`) · `attachmentRules.test.ts` V-12a–d/h, `terminal-attachment-routes.test.ts` V-12i |
| REQ-028, B-12 | ✅ | `issueImageSelection.ts:18-41` (ordem do corpo, 10 marcadas), `useIssueImageSelection.ts:14-16` · `issueImageSelection.test.ts`, `terminal-issue-images.test.ts` V-13a/b |
| **REQ-030** (limites) | 🟡 | Por arquivo e por quantidade (que conta as imagens marcadas na UI, `useAttachmentUploads.ts:23`): ok. **Os 30 MB somados com as imagens da Issue marcadas não recusam o anexo que estoura**: o staging soma só os uploads (`drizzleTerminalAttachmentDao.ts:22`), a UI não soma bytes, e a recusa só vem na confirmação (`sessionAttachmentDelivery.ts:31`). Ver I-1 |
| **§7.6 "Repetido", US-04.2, REQ-035** | ❌ (com o diálogo reaberto) | Envios de um diálogo fechado continuam no staging e entram no dedupe e no limite da próxima abertura. Ver B-1 |
| REQ-031, B-15, DEC-10, NM-07 | ✅ | `sessionAttachmentDelivery.ts:40-52`, `appendAttachmentsSection` · `terminal-open-attachments.test.ts` V-13c–e/g/h, `terminal-execution-flow.test.ts:42-44` |
| REQ-032, NFR-05 | ✅ | `AttachmentItem.tsx:8-22` (progresso `aria-live`, "Tentar de novo" só no que falhou), confirmação bloqueada no envio (`TerminalLaunchDialog.tsx:47`), `useDialogFocus.ts` (Esc e foco preso) · `AttachmentPicker.test.tsx` V-14a/b/d/f |
| REQ-033, REQ-035 (24 h), B-14 | ✅ | `terminalCleanup.ts`, chamada no `preflight` e no `open` · `terminal-cleanup.test.ts` V-12j, V-13f |
| REQ-036, REQ-039, DEC-11, NM-08 | ✅ | `fileSessionContextBuilder.ts:37-69` (plugin `flow-dev`, cópia por sessão) · `session-context-builder.test.ts` V-04d/e, `terminal-open.test.ts:89-96` V-04f |
| OBS-01–05 | ✅ | `terminalLaunchLog.ts`; abertura sem o prompt (`terminalSessionController.ts:66`), anexo recusado sem o nome (`terminalAttachmentService.ts:69`) |
| §14 (modelo), §20 (rollback), DEC-06 | ✅ | `0046_terminal_execution.sql` / `_rollback.sql`, `FEATURE_MIGRATIONS` atualizado · `terminal-schema.test.ts` |
| §15 (contrato tRPC) | ✅ | `schemas/terminal.ts`, `routers/terminal.ts`, `taskWorkspaceDtoMapper.ts:23` (`terminal.lastOpened`) |
| §15 (corpo de erro HTTP) | 🔀 | Spec: `{ reason }`; código: `{ error: { reason, message } }` (`terminalAttachmentRoute.ts:38`), registrado na 04.3, mas a spec não foi atualizada. Ver "Spec a discutir" |
| Não muda: nada abre sozinho, status intactos, sem GitHub (NM-01–03) | ✅ | `terminal-open.test.ts:71-87` V-11c/d/f |
| Não muda: agentes de planejamento isolados (NM-04) | ✅ | `claudeCodeRunner.test.ts` V-11e |
| Não muda: edição só de admin (NM-05) | ✅ | `project-settings/index.tsx:21-23` inalterado para detalhes, quadro e agentes |
| Não muda: "A próxima atividade ainda não foi iniciada." (NM-06) | ✅ | `PlanningDecisionView.tsx:32` usa `ROUTE_NEXT_NOTE` sem sessão |
| Não muda: `~/.claude` e o clone intocados | ✅ | V-04f |
| **V-10a** (e2e) | 🟡 | `e2e/terminal-execution.spec.ts:49` está `test.fixme`, e o corpo nem confere os `args`, os arquivos ou as skills. O fluxo do servidor está provado em `terminal-execution-flow.test.ts` (integração). Ver I-2 e S-1 |
| **V-10b** (smoke real pela UI) | 🟡 | `v00-spike.md:84`: "o disparo não passou pelos cliques da interface". Ver I-2 |
| Fora de escopo | ⛔ | Texto e link de `board_missing` na fila do trabalho, sem relação com a spec. Ver I-5 |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| Sem comentários (`code-standards.md:5`) | ✅ | O scanner não acusou comentários adicionados |
| `.ts` com até 100 linhas (`code-standards.md:39`) | ❌ | Ver I-4 |
| Funções com até 30 linhas (`code-standards.md:82`) | ❌ | Ver I-3 |
| Até 3 parâmetros (`code-standards.md:154`) | ❌ | Ver I-3 |
| Sem números e textos mágicos (`code-standards.md:223`) | 🟡 | Ver M-2 |
| Sem segredos no código (`code-standards.md:289`) | ✅ | Só variáveis de ambiente; o filtro do lançador não repassa segredos do servidor |
| Contratos em `application/`, implementações em `infra/`, ORM só em DAOs (`layered-backend` SKILL.md:37-38) | 🟡 | Ver M-1 |
| Fronteira tRPC: Zod `.strict()`, `protectedProcedure`, erros mapeados (`trpc-nextjs`) | ✅ | `schemas/terminal.ts`, `schemas/localCheckout.ts`, `terminalErrorMapper.ts` |
| Pastas do frontend (`nextjs-folder-structure`) | ✅ | Feature em `features/issues/assigned-work/`; `useDialogFocus` promovido para `src/hooks/` e o antigo removido; rota fina em `app/api/terminal-attachments/` com o helper em `lib/http/` |
| E2E: localizadores acessíveis, teste independente, nunca produção (`e2e-testing.md`) | ✅ | E2E-010/011 usam `getByRole`/`getByLabel` e criam e limpam os próprios dados; variáveis próprias de e2e |
| Verificação proporcional e completa no fim (`AGENTS.md:33-39`) | 🟡 | Suítes, typecheck e lint confirmados; `build` e e2e só pela palavra do implementador |
| Sem dependências novas | ✅ | O scanner não acusou mudança em arquivos de dependência |

## Achados

### B-1 (Bloqueante) — Anexos de um diálogo fechado continuam valendo e bloqueiam a próxima abertura
- **Onde:**
  - `apps/web/src/features/issues/assigned-work/components/TerminalLaunchDialog.tsx:26-29`: `close` só chama `onClose()`, e nada apaga os envios do diálogo;
  - `apps/web/src/features/issues/assigned-work/hooks/useAttachmentUploads.ts:38-42`: o `DELETE` só acontece no "Remover" explícito, e os ids somem com o estado quando o diálogo desmonta;
  - `packages/api/src/infra/database/dao/terminal/drizzleTerminalAttachmentDao.ts:17-22`: o dedupe e o limite contam todo o staging da pessoa na tarefa.
- **Contra:** §7.6, linha "Repetido" ("mesmo conteúdo já anexado"), REQ-030 e US-04.2.
- **Problema:** Ana anexa `erro.log`, cancela, reabre o diálogo e anexa `erro.log` de novo. Recebe "Este arquivo já está anexado." com a lista vazia. Se tinha enviado 10 arquivos antes de fechar, nenhum novo entra ("Limite de 10 arquivos por abertura."). O staging só some com a limpeza de 24 h, e a tela não tem como remover o que não mostra. A REQ-035 continua cumprida no papel, mas o anexo deixa de funcionar por um dia. Nenhum teste cobre "fechar e reabrir".
- **Correção esperada:** ao fechar o diálogo sem abrir a sessão, os uploads em staging daquela abertura são descartados (DELETE de cada `serverId`, também no desmonte), ou então o dedupe e o limite passam a valer só para os ids da abertura atual. Teste de componente: anexar, fechar, reabrir e anexar o mesmo arquivo → aceito. Teste de integração: o staging volta a zero depois do descarte.

### I-1 (Importante) — Os 30 MB somados com as imagens da Issue só são recusados na confirmação
- **Onde:**
  - `useAttachmentUploads.ts:23`: a UI soma só a quantidade;
  - `drizzleTerminalAttachmentDao.ts:22`: o staging soma só os uploads;
  - `sessionAttachmentDelivery.ts:31`: a soma com as imagens só é feita no `open`.
- **Contra:** REQ-030 ("recusar o anexo que estoura e dizer qual limite… contando as imagens da Issue marcadas").
- **Problema:** com 25 MB de imagens da Issue marcadas, um PDF de 8 MB sobe, aparece como enviado e entra na prévia. O erro "Os anexos passariam de 30 MB." só aparece ao confirmar, sem apontar o arquivo. O mesmo acontece ao marcar de novo uma imagem depois de enviar arquivos.
- **Correção esperada:** o diálogo soma os bytes das imagens marcadas com os uploads e recusa, no próprio item, o arquivo que estoura, com "Os anexos passariam de 30 MB.". A checagem do `open` continua como defesa. Teste V-14 com imagens marcadas somando perto de 30 MB.

### I-2 (Importante) — V-10a desligado no navegador e V-10b fora da UI, ambos marcados `[x]`
- **Onde:**
  - `apps/web/e2e/terminal-execution.spec.ts:49`: `test.fixme("V-10a …")`, cujo corpo não lê o JSON do lançador nem confere `contexto/`;
  - `docs/specs/execucao-no-terminal/v00-spike.md:84`: "o disparo não passou pelos cliques da interface";
  - `task_07.md`: V-10a e V-10b marcados.
- **Contra:** spec §23 V-10, §24 ("o spec e2e novo passando", "Smoke V-10 real feito uma vez pela UI").
- **Problema:** a ligação real entre a tela do trabalho, o diálogo, o upload multipart e a mutation nunca foi exercida num navegador. O motivo do `fixme` é real: a tela exige a verificação do GitHub, como em `work-workspace.spec.ts:42`. O fluxo do servidor está bem provado em `terminal-execution-flow.test.ts`. Ainda assim, o smoke pela UI era viável na máquina do usuário e não foi feito.
- **Correção esperada:** fazer o V-10b uma vez pela UI real e registrar em `v00-spike.md`: vínculo, rota Tech Spec, PDF e print anexados e o terminal aberto. Para o V-10a, ou ele roda, ou a spec troca o e2e de navegador pela integração (S-1). Em qualquer caso, o corpo do `fixme` deve conferir o que o roteiro do V-10a pede, para valer quando for ligado.

### I-3 (Importante) — Funções acima de 30 linhas e métodos com mais de 3 parâmetros em código novo
- **Onde:**
  - corpo maior que 30 linhas:
    - `apps/web/src/features/issues/assigned-work/hooks/useTerminalLaunch.ts:21` (37);
    - `hooks/useAttachmentUploads.ts:9` (35);
    - `components/TerminalLaunchDialog.tsx:20` (31);
  - mais de 3 parâmetros:
    - `packages/api/src/application/services/projects/localCheckoutService.ts:29` (construtor com 5);
    - `packages/api/src/application/services/terminal/terminalAttachmentService.ts:59` (`persist`, com 4);
    - `packages/api/src/routers/tasks.ts:15` (`createTasksRouter`, que passou a ter 4).
- **Contra:** `.agents/rules/code-standards.md:82` e `:154`.
- **Problema:** são regras explícitas do repositório. O Registro da 06.1 afirma "cada função com até 30 linhas", e o `useAttachmentUploads` tem 35.
- **Correção esperada:** dividir os hooks em funções nomeadas, cada uma com até 30 linhas, e trocar as listas longas de parâmetros por um objeto de dependências ou de entrada.

### I-4 (Importante) — Arquivos `.ts` que passaram de 100 linhas ou que cresceram acima do limite
- **Onde:**
  - passaram a estourar com esta mudança:
    - `apps/web/src/features/issues/assigned-work/components/AssignedWork.test.tsx` (98 → 105);
    - `packages/api/test/issue-deletion-purge.test.ts` (73 → 101);
  - já estavam acima do limite e cresceram:
    - `packages/api/test/issue-deletion-support.ts` (103 → 117);
    - `packages/api/src/application/services/issue-deletion/issueDeletionWorker.ts` (200 → 202);
    - `packages/api/src/infra/database/schema.ts` (125 → 127).
- **Contra:** `.agents/rules/code-standards.md:39`.
- **Correção esperada:**
  - mover o caso V-11a para um arquivo próprio, por exemplo `test/issue-deletion-terminal.test.ts`;
  - mover os casos novos de `AssignedWork.test.tsx` para outro arquivo;
  - extrair o suporte de terminal de `issue-deletion-support.ts`.
  
  `issueDeletionWorker.ts` e `schema.ts` são legado: aceite registrado ou divisão, sem crescer mais.

### I-5 (Importante) — Mudança fora do escopo: mensagem e link de `board_missing` na fila
- **Onde:**
  - `apps/web/src/features/issues/assigned-work/components/QueueNotices.tsx:10-31`: um ramo novo com o link "Ir para Configurações";
  - `workReasons.ts:17`: texto novo;
  - `ReadyQueue.tsx:24`: a prop `projectId`.
- **Contra:** nenhum item da spec ou das tasks; a §4 (fora de escopo) e a regra "Nada fora do escopo da spec" de cada `task_NN.md`.
- **Problema:** é um comportamento visível sem requisito, sem teste e sem registro em nenhuma task. Pode ser uma edição avulsa do usuário misturada ao working tree. Nesse caso, basta separá-la.
- **Correção esperada:** tirar do pacote desta feature e levar para um commit próprio, com o seu teste, ou registrar a origem.

### M-1 (Menor) — Consulta ORM fora de um DAO
- **Onde:** `packages/api/src/infra/terminal/terminalTaskFilesPurger.ts:11,13`: `this.database.select(...)` direto, numa classe de `infra/terminal/`.
- **Contra:** `layered-backend` SKILL.md:38 (as consultas ORM ficam nos DAOs, em `infra/database/dao/<domínio>/`).
- **Correção esperada:** mover as duas consultas para um método de `DrizzleTerminalAttachmentDao` ou `DrizzleTerminalSessionDao` e injetá-lo no purger.

### M-2 (Menor) — Constantes duplicadas e um literal mágico
- **Onde:**
  - `fileSessionContextBuilder.ts:60`: `{ mode: 0o600 }` literal;
  - `CLAUDE_BINARY` e `TERMINAL_BINARY` definidos duas vezes (`terminalOpenGuard.ts:12-13` e `terminalCommand.ts:3-4`);
  - o regex de UUID repetido em `diskAttachmentFileStore.ts:9`, `fileSessionContextBuilder.ts:9`, `drizzleTerminalIssueImageDao.ts:6` e `app/api/terminal-attachments/route.ts:7`.
- **Contra:** `code-standards.md:223`.
- **Correção esperada:** uma constante nomeada para o modo do arquivo, os binários importados de um lugar só e um único padrão de UUID compartilhado no pacote.

## Atualizações de spec a discutir
- **S-1 — V-10a no navegador:** a tela do trabalho só libera a operadora com a verificação do GitHub, que o e2e não controla. É a mesma limitação de `work-workspace.spec.ts:42` e da memória do projeto. Proposta: a §23 aceita `terminal-execution-flow.test.ts` como V-10a, a Definição de pronto exige o V-10b pela UI, e o fixme fica como dívida, com o roteiro completo no corpo.
- **S-2 — Texto da spec desatualizado depois do spike:**
  - a §12 (linha 263) e a §16 passo 5 (linha 341) dizem `contexto/.claude/skills/` e "move os anexos"; o código usa `contexto/skills/` (DEC-11) e copia, removendo o staging só depois do disparo, o que é melhor numa falha;
  - a §7.7 (linha 205) cita `/spec-to-tasks`, e o certo é `/flow-dev:spec-to-tasks`;
  - a §23 V-02 (linha 447) cita `/direct-executor`;
  - a §15 (linha 320) diz `{ reason }`, e o código devolve `{ error: { reason, message } }`.
- **S-3 — Q-01 só pela metade na spec:** a REQ-012 (linha 120) e a §20 (linha 409, "sem flag, salvo se a Q-01…") não citam `terminal_disabled`, embora a 07.2 diga que foram atualizadas.
- **S-4 — Vínculo salvo, mas inválido, no preflight:** o código devolve `checkout: null` (`terminalOpenGuard.ts:46-53`), e o diálogo diz "Você ainda não vinculou o clone local…", o que engana quem tem um vínculo que ficou inválido. A spec não cobre o caso. Sugestão: mostrar a mensagem da REQ-011 já no diálogo.

## Divergências entre o relatório do implementador e a evidência
- `task_07.md`, V-10a `[x]` ("o último argumento recebido é exatamente…") → no navegador o teste é `test.fixme` e não confere nada disso; só a integração prova.
- `task_07.md`, V-10b `[x]` ("smoke real pela UI") → `v00-spike.md:84` admite que não passou pela UI.
- Registro da 07.2, "a spec foi atualizada (… REQ-012 e §20: Q-01 …)" → a REQ-012 e a §20 continuam sem a Q-01 (S-3).
- Registro da 06.1, "cada função com até 30 linhas" → `useAttachmentUploads` tem 35 (I-3).
- As contagens das suítes (564, 460, 320), o typecheck e o lint **conferem** com o que rodei. O `pnpm build` e o e2e "2 passed, 1 skipped" não foram verificados por mim.

## Prompt de correção

> Corrija, nesta ordem, sem alterar nada fora do listado. Spec: `docs/specs/execucao-no-terminal/spec.md`.
>
> 1. **B-1 (task_06 · 06.1/06.2)**, em `apps/web/src/features/issues/assigned-work/hooks/useAttachmentUploads.ts` e `components/TerminalLaunchDialog.tsx`:
>    - Fechar o diálogo sem abrir a sessão (Cancelar, Esc ou desmonte) apaga do staging todos os uploads daquela abertura, com `DELETE /api/terminal-attachments/:id` para cada `serverId`. Não apague depois de uma abertura com sucesso.
>    - Testes: um teste de componente (anexar, fechar, reabrir, anexar o mesmo arquivo → aceito; o `DELETE` foi chamado) e um teste de integração em `packages/api/test/terminal-attachments.test.ts` (depois de `remove`, o mesmo conteúdo volta a ser aceito).
> 2. **I-1 (task_06 · 06.1)**, em `useAttachmentUploads.ts` e `useTerminalAttachments.ts`:
>    - Some os bytes das imagens da Issue marcadas e dos uploads ativos.
>    - O arquivo que levaria o total acima de 30 MB é recusado no próprio item com "Os anexos passariam de 30 MB.", sem envio (REQ-030).
>    - Teste V-14 com imagens marcadas de 25 MB e um arquivo de 8 MB.
> 3. **I-3**, em `hooks/useTerminalLaunch.ts`, `hooks/useAttachmentUploads.ts`, `components/TerminalLaunchDialog.tsx`, `localCheckoutService.ts`, `terminalAttachmentService.ts` (`persist`) e `routers/tasks.ts` (`createTasksRouter`):
>    - cada função com até 30 linhas;
>    - no máximo 3 parâmetros, usando objeto de dependências ou de entrada (`.agents/rules/code-standards.md:82`, `:154`).
> 4. **I-4**:
>    - mova o teste V-11a de `packages/api/test/issue-deletion-purge.test.ts` para um arquivo novo;
>    - divida `AssignedWork.test.tsx`;
>    - extraia o suporte de terminal de `packages/api/test/issue-deletion-support.ts`;
>    - todos os arquivos tocados por esta feature ficam com até 100 linhas, menos `issueDeletionWorker.ts` e `schema.ts`, que não podem crescer além de agora.
> 5. **I-5**:
>    - retire desta feature as mudanças de `board_missing` em `QueueNotices.tsx`, `ReadyQueue.tsx` e `workReasons.ts`;
>    - se forem desejadas, vão para um commit separado, com teste próprio.
> 6. **M-1**: mova as consultas de `infra/terminal/terminalTaskFilesPurger.ts` para métodos dos DAOs de terminal e injete-os no purger.
> 7. **M-2**:
>    - `0o600` vira constante;
>    - `CLAUDE_BINARY` e `TERMINAL_BINARY` ficam num lugar só;
>    - um único padrão de UUID compartilhado em `packages/api`.
> 8. **I-2 (task_07)**:
>    - Peça ao usuário o smoke V-10b pela UI real (rota Tech Spec, PDF e print, terminal aberto, o Claude descreve os anexos) e registre a observação dele em `v00-spike.md`.
>    - No corpo do `test.fixme` V-10a, acrescente as asserções do roteiro (JSON do lançador falso, `contexto/anexos/` e `contexto/skills/`).
>    - Não marque V-10b sem esse registro.
>
> Restrições:
> - sem comentários;
> - arquivos `.ts` com até 100 linhas, funções com até 30, até 3 parâmetros;
> - sem números mágicos e sem dependências novas;
> - textos da UI exatamente como na §7.6.
>
> Ao terminar, rode e mostre a saída de:
> - os testes afetados (`pnpm --dir apps/web exec vitest run src/features/issues/assigned-work`, `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-attachments.test.ts <arquivo novo do V-11a>`);
> - depois, uma vez: `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration`, `pnpm --dir apps/web test`, `pnpm typecheck`, `pnpm lint` e `pnpm build` (com o `next dev` parado).
>
> Não marque nada como concluído sem essa saída.
