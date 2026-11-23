# Revisão de conformidade 001: Acompanhamento e artefatos da execução no terminal

> **Data:** 2026-11-22 · **Escopo:** feature inteira (task_01 a task_08, todas `completed`) · **Intervalo:** `HEAD` + mudanças não commitadas (164 arquivos)
> **Spec:** `docs/specs/acompanhamento-e-artefatos/spec.md`, `v15-spike.md`, `_tasks.md`, `task_01.md`–`task_08.md`
> **Regras lidas:** `CLAUDE.md` → `AGENTS.md`, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md` (idêntica a `.claude/rules/`), `.agents/rules/e2e-testing.md`, skills obrigatórias `layered-backend`, `trpc-nextjs`, `nextjs-folder-structure` (regras centrais)

## Veredito: REPROVADO (sem bloqueantes)

Nenhum bloqueante, e todas as verificações passam. Ficam 2 achados importantes, que pela régua da revisão pedem correção antes do merge ou aceite explícito do risco. O primeiro: a linha do tempo mostra "Aguardando você" para quem só lê, contra a P-J e a REQ-024. O segundo: o fluxo ponta a ponta **na tela** nunca foi executado, porque o e2e V-19a/b está em `fixme` e o smoke V-19c rodou sem navegador, mas a 08.2 está marcada como pronta. Corrigido o primeiro e resolvido o segundo (executado ou aceito por você), a feature passa a APROVADO COM RESSALVAS.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 0 | 2 | 5 | 2 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm --dir packages/api test` | exit 0 · 90 arquivos, 593 passed | ✅ |
| `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`) | exit 0 · 91 arquivos, 520 passed | ✅ |
| `pnpm --dir apps/web test` | exit 0 · 74 arquivos, 354 passed | ✅ |
| `pnpm typecheck` (api + web) | exit 0 | ✅ |
| `pnpm lint` | exit 0 | ✅ |
| `pnpm build` | exit 0 · rota `ƒ /api/terminal-sessions/events` no build | ✅ |
| `scan_diff.py --worktree --max-lines 100` | 16 hints; 0 viraram achado (placeholders são o `test.fixme` da P-G e texto de docs; `secret-like` são marcadores de teste; `hollow-assertion` vêm acompanhadas de asserções exatas) | — |
| Sondagem extra da NFR-09 (`tsx` sobre `renderArtifactMarkdown` com 13 vetores: autolink `javascript:`, entidades, link de referência, `data:`, HTML em tabela, `<svg onload>`, título com aspas) | todo HTML sai escapado como texto; nenhum `href` `javascript:`/`data:` | ✅ |

**Não executado:** o e2e `apps/web/e2e/terminal-tracking.spec.ts` é `test.fixme` (P-G) e não roda; o smoke V-19c é manual e não é reproduzível aqui. Os dois estão em I-2.

## Conformidade com a spec

| Item | Status | Evidência |
|---|---|---|
| REQ-014 | ✅ | `terminalSessionController.ts:52` (`!input.allowAdditional && hasActiveSession` → `session_already_active`); `drizzleTerminalSessionDao.ts:38`; UI em `useTerminalLaunch.ts`/`TerminalSessionConfirm.tsx` · V-08j, V-08s |
| REQ-016 | ✅ | `OperatorStages.tsx:23-25` (aba só com sessão); `planningModel.ts:41-45` · V-08l |
| REQ-017, §7.2 | ✅ | `terminalSessionStateMachine.ts:7-21` (tabela `Record` constante) · V-05a–h |
| REQ-018 | ✅ | `hookEventSummarizer.ts:33-57`, `hookToolEvents.ts:26-44` (cortes de 500 e 200) · V-06a–e (ver M-2) |
| REQ-019, NFR-04 | ✅ | o summarizer lê só os campos da §15; nunca `tool_response`/`content`/`new_string` · V-06k; log sem conteúdo · V-17l |
| REQ-020, DEC-08 | ✅ | `workState.ts` `TERMINAL_POLL_MS = 3_000` · V-08k (ver S-1) |
| REQ-021, DEC-07, P-K | ✅ | `tasksController.ts:27` expira antes do `snapshot`; `drizzleTerminalExecutionDao.ts:36-39` · V-08d (ver M-3) |
| REQ-022, B-05 | ✅ | `terminalSessionTiming.ts:6-10`; `ExecutionStatus.tsx:17` · V-08e, V-08o |
| REQ-023 | ✅ | `ExecutionHistory.tsx` (botão com `aria-expanded`) · V-08b, V-08q |
| REQ-024, §7.4 | 🟡 | servidor: `requireRead` em `byId` e `tasks.artifacts.*` · V-08h, V-20d; etapa sem ações · V-08r, V-18f. **Linha do tempo ignora o modo leitura** → I-1 |
| REQ-026 | ✅ | `terminalEventController.ts:15-19`, `route.ts:11` · V-07a, V-07k |
| REQ-034 | ✅ | `terminalExecutionReader.ts:33-35`; `SessionAttachmentList.tsx` · V-08f, V-08q |
| REQ-041, §7.8 skill ativa | ✅ | `terminalEventIngestion.ts:27-31,55`; `skillCommand.ts` (P-A, P-B) · V-06g–i, V-07h |
| REQ-042 | ✅ | `drizzleArtifactCaptureDao.ts:14` (`file_edit` com skill, `.md`); `artifactCaptureService.ts:24-51` · V-16a |
| REQ-043 | ✅ | `artifactCapturePlan.ts:14-16` (sha da última versão) · V-17a |
| REQ-044 | ✅ | unique (`task_id`, `relative_path`) na 0047:41 · V-16g |
| REQ-045 | ✅ | `terminalExecutionQueries.ts:26-29`; `ArtifactList.tsx` · V-08i, V-18a (ver M-4) |
| REQ-046, P-E | ✅ | `artifactFailureCopy.ts` com os textos exatos; `fsCheckoutFileReader.ts:26-37` · V-17c–f, V-18e |
| REQ-047, B-21 | ✅ | V-17h (clone A → clone B mantém v1) |
| REQ-048, B-18 | ✅ | `fsCheckoutFileReader.ts:44,48` (léxico e `realpath` dentro do clone) · V-16b–e |
| REQ-049 | ✅ | `deletionPurge.ts:32-34` antes de anexos e sessões · V-20a |
| REQ-050, P-I | ✅ | `routers/artifacts.ts`, `schemas/artifacts.ts`, `taskArtifactController.ts` · V-20b–d |
| NFR-02 | ✅ | `sessionToken.ts` (32 bytes, sha256); só o hash no banco · V-07e (ver S-2) |
| NFR-03 | ✅ | limite de 5 MB em `route.ts:6,12`; p95 · V-07l; `onFailure: "continue"`, `timeout: 5` em `claudeHookSettings.ts` (ver M-1) |
| NFR-07, DEC-14 | ✅ | `after()` em `route.ts:20` · V-17i, V-17j |
| NFR-08 | ✅ | `aria-live="polite"` em `ExecutionStatus.tsx:13`; lista em botões; `select` nativo · V-08p, V-18d |
| NFR-09 | ✅ | `artifactMarkdown.ts` (HTML cru escapado, links só `http(s)`/`mailto`/`#`, imagens viram texto) · V-18c + sondagem extra |
| DEC-02, DEC-04 | ✅ | `claudeSessionSettingsWriter.ts` (`privado/` 0700, arquivo 0600, fora de `contexto/`); `--settings` em `terminalCommand.ts` · V-07e, V-07f |
| DEC-03 | ✅ | route handler `runtime = "nodejs"`, URL de `BETTER_AUTH_URL` |
| DEC-12, DEC-13 | ✅ | skill do último `file_edit` (`DISTINCT ON … desc`); conteúdo em `task_artifact_versions.content` |
| B-06, B-07, B-11 | ✅ | V-05e, V-07b; V-07c, V-08n; V-05f |
| B-17, B-19, B-20 | ✅ | V-07i, V-16f; V-17b (trava `FOR UPDATE` + marca d'água); V-16h |
| US-03 (1–4), US-05 (1–4) | 🟡 | cada peça tem teste de componente e de integração; **o fluxo na tela nunca rodou ponta a ponta** → I-2 |
| Não muda #1 (status do planejamento/quadro) | ✅ | ingestão e captura só tocam tabelas de terminal · V-20f |
| Não muda #2 (não escreve no clone/GitHub) | ✅ | leitor só `realpath`/`stat`/`readFile` · V-20g |
| Não muda #3 (Issue Author/Planejamento sem hooks) | ✅ | V-20e em `claudeCodeRunner.test.ts` |
| Não muda #4 (prompt, anexos, skills da Spec A) | ✅ | asserções V-04 trocadas por versões com `--settings`, não afrouxadas (`terminalCommand.test.ts`, `terminal-open.test.ts`, `terminal-execution-flow.test.ts`) |
| Migration §14, §20 | ✅ | 0047 e rollback conferem coluna a coluna · MIG-a–f |
| V-15 | ✅ | `v15-spike.md` (manual; não reexecutável aqui) |
| V-19 | 🟡 | V-19a/b `test.fixme` (P-G); V-19c sem tela → I-2 |
| Fora de escopo | ✅ | nada edita, aprova ou apaga artefato; sem diff/download; nenhuma dependência nova (`marked` já existia) |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| Sem comentários (`code-standards.md:5`) | ✅ | scanner sem `comment-added` |
| Máx. 100 linhas por `.ts` (`code-standards.md:39`) | ✅ | nenhum arquivo novo acima; `schema.ts` já tinha 127 linhas em `HEAD` (agora 129), pré-existente |
| Funções ≤ 30 linhas (`code-standards.md:82`) | ❌ | `useTerminalLaunch` com 32 linhas → M-5 |
| ≤ 3 parâmetros (`code-standards.md:154`) | ❌ | helpers de teste e do e2e com 4–5 → M-5 |
| Textos mágicos / segredos (`code-standards.md:221,289`) | ✅ | constantes nomeadas; nenhum segredo |
| Contratos em `application/`, implementações em `infra/` (`layered-backend`, `_tasks.md`) | ✅ | `CheckoutFileReader`, `SessionSettingsWriter` e os DAOs atrás de interfaces |
| Entrada fina → controller → service/DAO (`layered-backend`) | ✅ | `route.ts` → `TerminalEventController` → `planIngestion`/DAO |
| tRPC: Zod `.strict()`, `protectedProcedure`, erros mapeados (`trpc-nextjs`) | ✅ | `schemas/artifacts.ts`; `artifact_unavailable` → NOT_FOUND |
| Rota enxuta, feature em `src/features/` (`apps/web/AGENTS.md`, `nextjs-folder-structure`) | ✅ | lógica em `lib/http/terminalEventRoute.ts` e `features/issues/assigned-work/` |
| E2E: locators acessíveis, sem credenciais (`e2e-testing.md`) | ✅ | `getByRole`/`getByLabel`; token lido do arquivo do lançador falso |
| `.agents/rules` = `.claude/rules` (`AGENTS.md:16`) | ✅ | `diff -r` sem diferença |
| Verificação proporcional e `build` com rota nova (`AGENTS.md:39`) | ✅ | rodado nesta revisão |

## Achados

### task_06 · 06.1/06.2

#### I-1 (Importante): a linha do tempo mostra "Aguardando você" para quem só lê
- **Onde:** `apps/web/src/features/issues/assigned-work/planningModel.ts:44`, `detail: sessionShortLabel(session, { reader: false })`.
- **Contra:** P-J (`spec.md:457`, `_tasks.md` P-J), REQ-024.
- **Problema:** `PlanningStage` mostra a `PlanningTimeline` também para quem só lê (`OperatorStages.tsx:22`). A entrada "Execução no terminal" fixa `reader: false`, então um membro vê "Aguardando você" na linha do tempo e "Aguardando a pessoa operadora" na etapa e na aba, na mesma tela. Nenhum teste cobre a linha do tempo em modo leitura.
- **Correção esperada:** com `waiting`, a entrada da linha do tempo mostra "Aguardando a pessoa operadora" para quem só lê e "Aguardando você" para a operadora. Um teste cobre os dois casos.

### task_08 · 08.1/08.2

#### I-2 (Importante): o fluxo na tela nunca foi executado ponta a ponta, mas a 08.2 está marcada como pronta
- **Onde:** `apps/web/e2e/terminal-tracking.spec.ts:30` (`test.fixme`); `v15-spike.md:71`, "O que este smoke não cobriu: a janela do GNOME Terminal, a sessão interativa com `/exit`, e a tela do navegador"; `task_08.md` 08.2 `[x]` e V-19c `[x]`.
- **Contra:** V-19 (§23), §24 "Smoke V-19 real feito uma vez"; "Pronto quando" da 08.2 (`task_08.md:76`: registrar "o que se viu na tela"); P-G (`spec.md:454`: "o V-19c cobre o fluxo").
- **Problema:** a P-G aceitou o `fixme` com a condição de que o V-19c provasse o fluxo. O V-19c rodou em modo `-p`, sem navegador: não viu "Em andamento", "Aguardando você", o artefato renderizado, o seletor de versão nem "Encerrada" depois de `/exit` (US-03.3). Cada peça tem teste isolado, mas a integração `byId` → polling → aba → `tasks.artifacts.get` → render nunca rodou de verdade. O registro de execução admite a lacuna, e mesmo assim a mini-tarefa e o critério da §24 estão marcados.
- **Correção esperada:** executar o V-19 na tela, pelo e2e com GitHub e quadro controlados ou por um smoke manual no navegador com o Claude interativo no GNOME Terminal (incluindo `/exit` → "Encerrada" com horário), e registrar o que se viu em `v15-spike.md`. Se não for viável agora, desmarcar a 08.2 e registrar na spec (P-G) que o fluxo na tela fica sem prova, como risco aceito por você.

### task_03 · 03.2/03.5

#### M-1 (Menor): sessão encerrada com corpo acima de 5 MB recebe `413` e ainda grava
- **Onde:** `apps/web/src/app/api/terminal-sessions/events/route.ts:12-15` e `terminalEventController.ts:21-24`; `authenticate` resolve a sessão sem olhar o estado.
- **Contra:** §16 passo 1 ("Sessão em estado final: `204` sem gravar (B-06)", antes de ler o corpo).
- **Problema:** com o token de uma sessão `ended`, um corpo grande responde `413` e incrementa `dropped_events` numa sessão final.
- **Correção esperada:** sessão em estado final → `204` sem ler o corpo e sem gravar nada.

#### M-2 (Menor): `summary` sem corte em `file_edit`, `skill` e `started` pode violar o check do banco
- **Onde:** `hookToolEvents.ts:30` (`summary: relative`), `hookToolEvents.ts:43` (`summary: name`), `hookEventSummarizer.ts:49` (`source`).
- **Contra:** §14 (`summary` ≤ 500, check `task_terminal_events_summary_check`); §15 (o endpoint responde só `204`/`401`/`413`).
- **Problema:** um caminho absoluto fora do clone, ou um nome de skill, com mais de 500 caracteres faz o insert falhar. O route responde 500, e o lote inteiro do hook (inclusive o `started` implícito e a mudança de estado) se perde.
- **Correção esperada:** `summary` cortado em 500 em todos os tipos; `path` pode continuar completo. Um teste com um caminho de 600 caracteres.

### task_05 · 05.1/05.2

#### M-3 (Menor): `byId` expira sessões antes de conferir que a tarefa pertence ao projeto
- **Onde:** `packages/api/src/controllers/tasksController.ts:27`. `expireUnconfirmedTerminals(input.taskId, …)` roda depois de `requireRead(projectId)`, mas antes de `findScoped`.
- **Contra:** §18 (autorização na leitura da tarefa).
- **Problema:** quem lê o projeto A, passando o `taskId` de uma tarefa do projeto B, dispara o `UPDATE opening → unconfirmed` em B. Nada vaza, e a transição seria a mesma na próxima leitura autorizada, mas é uma escrita fora do escopo autorizado.
- **Correção esperada:** a expiração filtra também por `projectId` (ou roda depois de validar o escopo).

#### M-4 (Menor): o "horário da última" versão muda quando a captura falha
- **Onde:** `artifactVersionWrites.ts:8`: `upsertArtifact` grava `updatedAt: new Date()` também em `recordFailure`.
- **Contra:** REQ-045 ("horário da última" versão).
- **Problema:** depois da versão 3, uma falha ("Arquivo não encontrado no clone") faz o item mostrar "versão 3" com o horário da falha.
- **Correção esperada:** `updatedAt` reflete a última versão. Se quiser também o horário da falha, exponha-o num campo separado.

### task_06 · 06.4 e testes de apoio

#### M-5 (Menor): limites de função e de parâmetros do `code-standards.md`
- **Onde:**
  - `apps/web/src/features/issues/assigned-work/hooks/useTerminalLaunch.ts:45-78`: `useTerminalLaunch` com 32 linhas (eram 26 em `HEAD`);
  - `packages/api/test/terminal-execution-support.ts:25` (`seedEvents`, 4 parâmetros), `:30` (`seedAttachment`, 5) e `:34` (`seedArtifact`, 4);
  - `apps/web/e2e/terminal-tracking.spec.ts:19` (`openSession`, 4).
- **Contra:** `.agents/rules/code-standards.md:82` (≤ 30 linhas) e `:154` (≤ 3 parâmetros).
- **Correção esperada:** extrair `send` do hook para uma função própria; objetos de parâmetro nos helpers.

## Atualizações de spec a discutir

- **S-1: sessões abandonadas ficam "ativas" para sempre.** Pela §7.2, só `ended` e `launch_failed` são finais. Uma janela fechada sem `SessionEnd` (B-05) fica `waiting`/`running`, e toda sessão da Spec A anterior à 0047 vira `unconfirmed`. O código segue a spec, e as consequências são duas:
  - a tela da tarefa faz polling a cada 3 s indefinidamente (DEC-08, `workState.ts`);
  - cada nova abertura pede a confirmação da REQ-014 (`drizzleTerminalSessionDao.ts:38`).

  Decidir se `unconfirmed` e sessões "sem sinal" há mais de 30 min contam como ativas para o polling e para a REQ-014.
- **S-2: NFR-02 contra §16.** A NFR-02 diz que o token "deixa de valer" no estado final; a §16 manda responder `204` sem gravar. O código segue a §16: `token_hash` nunca é limpo, e o token continua resolvendo a sessão. Vale alinhar o texto da NFR-02 ao comportamento.

## Divergências entre o relatório do implementador e a evidência

- As contagens das suítes (593 / 520 / 354), o typecheck, o lint e o build relatados batem com esta revisão.
- **08.2 e V-19c marcados `[x]`, e a §24 registrada como "smoke V-19 real feito"** → o próprio `v15-spike.md:71` diz que a tela do navegador e o `/exit` interativo não foram exercitados (I-2).
- **"Nenhuma regra do AGENTS.md violada"** (critério de sucesso das tasks 03–08) → M-5.
- Registro da 06.4: "→ 2+ passed" não é uma contagem verificável. Os testes existem e passam nesta revisão.

## Prompt de correção

> Corrija, nesta ordem, sem alterar nada fora do listado:
> 1. **I-1** (`apps/web/src/features/issues/assigned-work/planningModel.ts`, `PlanningTimeline.tsx`, `PlanningStage.tsx`): a entrada "Execução no terminal" da linha do tempo recebe o modo leitura e, com sessão `waiting`, mostra "Aguardando a pessoa operadora" para quem só lê e "Aguardando você" para a operadora (P-J, REQ-024). Acrescente um teste com os dois casos.
> 2. **I-2** (V-19, `task_08.md` 08.2): execute o V-19 na tela, pelo e2e `apps/web/e2e/terminal-tracking.spec.ts` com GitHub e quadro controlados ou por um smoke manual no navegador com o Claude interativo no GNOME Terminal. Confira "Em andamento", "Aguardando você", o artefato v1 renderizado, a v2 com o seletor abrindo a v1, e `/exit` → "Encerrada" com horário, e registre o que viu em `v15-spike.md`. Se não puder executar, desmarque a 08.2 e o V-19c e registre a lacuna na P-G da spec como risco aceito; não marque nada sem a prova.
> 3. **M-1** (`apps/web/src/app/api/terminal-sessions/events/route.ts`, `packages/api/src/controllers/terminalEventController.ts`): sessão em estado final → `204` antes de ler o corpo, sem incrementar `dropped_events` (§16 passo 1). Teste: token de sessão `ended` com corpo de 5 MB + 1 → `204`, `dropped_events` inalterado.
> 4. **M-2** (`packages/api/src/application/services/terminal/hookToolEvents.ts`, `hookEventSummarizer.ts`): `summary` cortado em 500 caracteres em `file_edit`, `skill` e `started` (§14). Teste: `Write` com caminho de 600 caracteres grava o evento com `summary` de 500.
> 5. **M-3** (`packages/api/src/controllers/tasksController.ts`, `drizzleTerminalExecutionDao.ts`): a expiração de `opening` só atinge tarefas do `projectId` autorizado. Teste: `byId` com `taskId` de outro projeto não altera as sessões dele.
> 6. **M-4** (`packages/api/src/infra/database/dao/artifacts/artifactVersionWrites.ts`): `recordFailure` não altera `updatedAt`; o horário mostrado é o da última versão (REQ-045). Teste: falha depois da v1 mantém `updatedAt` igual ao `captured_at` da v1.
> 7. **M-5**: `useTerminalLaunch` com no máximo 30 linhas (extraia o envio); `seedEvents`, `seedAttachment`, `seedArtifact` (`packages/api/test/terminal-execution-support.ts`) e `openSession` (`apps/web/e2e/terminal-tracking.spec.ts`) com objeto de parâmetros.
>
> Restrições: arquivos `.ts` ≤ 100 linhas, funções ≤ 30 linhas e ≤ 3 parâmetros, sem comentários, sem linhas em branco dentro de funções, sem novas dependências, textos da UI exatamente como na spec.
> Ao terminar, rode e mostre a saída de:
> - os testes afetados (`pnpm --dir apps/web exec vitest run <arquivos>`, `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts <arquivos>`);
> - `pnpm --dir packages/api test`;
> - `pnpm --dir packages/api test:integration`;
> - `pnpm --dir apps/web test`;
> - `pnpm typecheck`;
> - `pnpm lint`.
>
> Não marque como concluído sem essa saída.
