---
status: completed
title: "Regras puras: estados, documento de etapa e prompts"
type: backend
complexity: medium
---

# Task 02: Regras puras: estados, documento de etapa e prompts

## Visão geral
Implementa como funções puras, sem banco nem processo, as três regras de que o ciclo depende: a máquina de estados de §7.1, o leitor e validador de `reviews/etapa.md` de §7.3 e os prompts e mensagens exatos de §7.5. Tudo é testado em unidade; o passo do ciclo (05, 06), o serviço (04) e a tela (07, pelos literais) consomem estas funções.

<critical>
- LEIA a spec (§7.1, §7.3, §7.5, §8, DEC-02) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use a skill `layered-backend` para a posição dos arquivos em `application/services/review/`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`.claude/skills/software-testing/SKILL.md`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- §7.1 / REQ-030: cada estado DEVE oferecer exatamente as ações da tabela de §7.1; qualquer outra DEVE ser recusada com `review_action_invalid`.
- REQ-013, REQ-014, REQ-015: as transições do sistema DEVEM seguir §7.1, abrindo nova rodada a cada Reprovada, sem limite.
- REQ-022, REQ-025, REQ-028, REQ-029: `stop` → `stopped`; `retry` → a mesma etapa, sem mudar a rodada; `accept` → `accepted`; `fix` → `executing` na mesma rodada.
- REQ-044: em `failed`, uma etapa válida gravada pela sessão da vez DEVE levar à transição dessa etapa.
- §7.3 / REQ-012 / REQ-024: o documento só vale se gravado pela sessão da vez depois do início da vez, com valor permitido para o papel e, na revisão, com `relatorio` novo, dentro da pasta e sem "..".
- B-02, B-03, B-12 (§8).
- §7.5 / REQ-017 / REQ-006: prompts iniciais, continuações, ressalvas e substituta exatos; num ciclo parcial, toda mensagem de revisão termina com a frase parcial.
- Os motivos de falha de §7.4 ("A sessão de revisão terminou sem atualizar {documento}.", "A sessão de execução terminou sem atualizar {documento}.", "O relatório indicado em {documento} não é novo.") vêm daqui.

## Interfaces
- **Consome:** `TaskError` de `application/services/tasks/taskErrors.ts`; a validação de caminho de `application/services/terminal/taskPlanPrompts.ts` (`requireRelativePath`, `requireInside`: exporte-as ou mova-as para um módulo compartilhado sem mudar o comportamento); `SPEC_TO_TASKS_COMMAND` e afins de `terminalPromptCopy.ts` como padrão de constantes.
- **Produz** (em `packages/api/src/application/services/review/`):
  - `reviewCycleTypes.ts`: `ReviewCycleState`, `ReviewRole = "review" | "execute"`, `ReviewAction = "stop" | "retry" | "accept" | "fix"`, `ReviewStage = "execute" | "aprovada" | "ressalvas" | "review"`, `ReviewVerdict = "approved" | "caveats" | "rejected"`, `FINAL_REVIEW_STATES`, `isFinalReviewState(state)`.
  - `reviewCycleRules.ts`: `allowedActions(state): ReviewAction[]`; `applyAction({ state, role, round }, action): ReviewTransition` (lança `TaskError("review_action_invalid")`); `applyStage({ state, role, round }, stage): ReviewTransition`; `ReviewTransition = { state; role; round; verdict: ReviewVerdict | null; ends: boolean }`.
  - `reviewStageReader.ts`: `parseStageDocument(content): { etapa: string | null; relatorio: string | null }`; `readStage(input: StageReadInput): StageReadResult`, com `StageReadInput = { role; folder; stepStartedAt; sessionId; edits: { sessionId; path; at }[]; content: string | null; previousReportNumber: number | null }` e `StageReadResult = { ok: true; stage: ReviewStage; reportPath: string | null; reportNumber: number | null } | { ok: false; reason: string }`.
  - `reviewPrompts.ts`: `stageDocumentPath(folder)`, `reviewInitialPrompt({ folder, partial })`, `reviewContinuation({ folder, partial })`, `executeInitialPrompt({ folder, reportPath })`, `executeContinuation({ folder, reportPath })`, `caveatsPrompt({ folder, reportPath })`; todas lançam `TaskError("invalid_path")` com caminho inválido.
  - `reviewCopy.ts`: os textos de §7.5 e os motivos de falha de §7.4, como constantes.

## Mini-tarefas

- [x] **02.1 — Tipos e máquina de estados do ciclo**
  - **Arquivos:** `packages/api/src/application/services/review/reviewCycleTypes.ts` (criar), `reviewCycleRules.ts` (criar), `reviewCycleRules.test.ts` (criar)
  - **Testes:** V-02a, V-02b, V-02c, V-02d, V-02e, V-02f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/review/reviewCycleRules.test.ts` passa
- [x] **02.2 — Leitor e validador do documento de etapa**
  - **Arquivos:** `packages/api/src/application/services/review/reviewStageReader.ts` (criar), `reviewStageReader.test.ts` (criar), `reviewCopy.ts` (criar, só os motivos de falha)
  - **Testes:** V-01a, V-01b, V-01c, V-01d, V-01e, V-01f, V-01g, V-01h
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/review/reviewStageReader.test.ts` passa
  - **Nota:** `edits` são os `file_edit` da sessão (caminho relativo ao checkout); o caminho de `relatorio` é relativo à raiz do checkout. Se o arquivo passar de 100 linhas, separe `parseStageDocument` e a validação do relatório.
- [x] **02.3 — Prompts e mensagens exatos**
  - **Arquivos:** `packages/api/src/application/services/review/reviewPrompts.ts` (criar), `reviewPrompts.test.ts` (criar), `reviewCopy.ts` (alterar), `packages/api/src/application/services/terminal/taskPlanPrompts.ts` (alterar só para exportar ou extrair a validação de caminho)
  - **Testes:** V-03a, V-03b, V-03c, V-03d, V-03e, V-03f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/review/reviewPrompts.test.ts src/application/services/terminal/taskPlanPrompts.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
- Espelhe `taskPlanPrompts.ts` e `terminalPromptCopy.ts`: textos em constantes, funções curtas, `TaskError("invalid_path")` para caminho inválido.
- `readStage` é a única regra de validade de §7.3. Considere só os `edits` de `{pasta}/reviews/etapa.md` com `sessionId` igual ao da vez e `at > stepStartedAt`. Para a revisão, o relatório também precisa ter um `edit` da mesma sessão na mesma vez (B-03: "gravado nessa mesma vez") e número maior que `previousReportNumber`.
- O motivo "não atualizado" depende do papel: revisão → "A sessão de revisão terminou sem atualizar {documento}."; execução → "A sessão de execução terminou sem atualizar {documento}.". Um valor de outro papel conta como não atualizado.
- A frase do ciclo parcial é anexada ao fim, separada por espaço, em `reviewInitialPrompt` e `reviewContinuation`.
- O prompt inicial da revisão começa com `/flow-dev:spec-conformance`; V-03f confere que `codexTurnInput` (`application/services/terminal/codex/codexTurnInput.ts`) o reconhece como skill.

### Arquivos relevantes
- `packages/api/src/application/services/terminal/taskPlanPrompts.ts` e `.test.ts`: validação de caminho e padrão de teste exato.
- `packages/api/src/application/services/terminal/terminalPromptCopy.ts`: padrão de constantes de texto.
- `packages/api/src/application/services/terminal/planCaptureRule.ts`: normalização de caminhos relativos.
- `packages/api/src/application/services/terminal/codex/codexTurnInput.ts` e `codexPrompt.test.ts`: reconhecimento do prefixo de skill.

### Arquivos afetados
- `taskPlanPrompts.ts`: só a exportação da validação; `taskPlanPrompts.test.ts` deve continuar passando sem mudança.

### Decisões relacionadas
- DEC-02 (spec §17): a etapa vem só do documento; o leitor fica pequeno e o formato é fixo.

## Premissas
Nenhuma.

## Testes atribuídos
- [ ] V-02a: para cada estado, `allowedActions` → `reviewing`/`executing`: `[stop]`; `caveats`: `[accept, fix]`; `failed`: `[retry, stop]`; `approved`/`accepted`/`stopped`: `[]`.
- [ ] V-02b: `accept` em `reviewing`, `retry` em `executing`, `fix` em `failed`, qualquer ação em `approved` → `TaskError("review_action_invalid")`.
- [ ] V-02c: `reviewing` + `execute` → `executing`, mesma rodada, veredito `rejected`; `reviewing` + `aprovada` → `approved`, `ends: true`; `reviewing` + `ressalvas` → `caveats`, veredito `caveats`; `executing` + `review` → `reviewing` com rodada + 1; rodada 7 + `review` → rodada 8; `reviewing` + `review` e `executing` + `execute` → recusados.
- [ ] V-02d: `failed` (papel revisão, rodada 3) + `retry` → `reviewing`, rodada 3; `failed` (papel execução) + `retry` → `executing`, rodada 3; `caveats` + `fix` → `executing`, mesma rodada; `caveats` + `accept` → `accepted`, `ends: true`; `reviewing` + `stop` → `stopped`, `ends: true`; `failed` + `stop` → `stopped`.
- [ ] V-02e: `failed` com papel revisão + `execute` → `executing`; `failed` com papel execução + `review` → `reviewing`, rodada + 1 (REQ-044).
- [ ] V-02f: `isFinalReviewState` → verdadeiro só para `approved`, `accepted`, `stopped`.
- [ ] V-01a: revisão, `edit` de `docs/specs/x/reviews/etapa.md` e de `review-005.md` pela sessão da vez depois do início, conteúdo `etapa: execute\nrelatorio: docs/specs/x/reviews/review-005.md`, anterior 4 → `{ ok, stage: "execute", reportPath: ".../review-005.md", reportNumber: 5 }`.
- [ ] V-01b: revisão com `aprovada` e com `ressalvas` → aceitas; execução com `etapa: review` sem `relatorio` → `{ ok, stage: "review", reportPath: null }`.
- [ ] V-01c: revisão com `etapa: review` → `{ ok: false, reason: "A sessão de revisão terminou sem atualizar docs/specs/x/reviews/etapa.md." }`; execução com `etapa: execute` → motivo da execução.
- [ ] V-01d (B-12): `edit` do documento pela sessão da vez com `at` antes de `stepStartedAt`, conteúdo válido → motivo "não atualizado".
- [ ] V-01e: `edit` do documento feito pela outra sessão do ciclo depois do início → motivo "não atualizado".
- [ ] V-01f (B-03): `relatorio` aponta `review-004.md` com anterior 4 → "O relatório indicado em docs/specs/x/reviews/etapa.md não é novo."; aponta `review-006.md` sem `edit` nesta vez → mesmo motivo.
- [ ] V-01g: `relatorio` em `docs/specs/y/reviews/review-005.md`, em `docs/specs/x/reviews/../review-005.md`, em `/tmp/review-005.md` ou fora de `reviews/review-NNN.md` → recusado com o motivo de relatório não novo.
- [ ] V-01h (B-02): conteúdo com `# título`, `motivo: qualquer` e espaços extras → só `etapa` e `relatorio` lidos; dois relatórios gravados na vez (005 e 006) com `relatorio` em 005 → vale o 005.
- [ ] V-03a: `reviewInitialPrompt({ folder: "docs/specs/x", partial: false })` → exatamente o texto "Revisão, prompt inicial" de §7.5 com `{pasta}` e `{documento}` = `docs/specs/x/reviews/etapa.md`.
- [ ] V-03b: `reviewContinuation` com `partial: false` → texto exato; `reviewInitialPrompt` e `reviewContinuation` com `partial: true` → terminam com "Há tarefas não concluídas: faça a revisão parcial e marque o relatório como parcial."; as mensagens de execução não terminam com essa frase.
- [ ] V-03c: `executeInitialPrompt`, `executeContinuation` e `caveatsPrompt` com `reportPath: "docs/specs/x/reviews/review-004.md"` → textos exatos de §7.5, com as proibições ("Não altere a spec nem os relatórios de revisão. Não faça commit, push nem PR sem eu pedir.") no inicial e nas ressalvas.
- [ ] V-03d: a substituta usa o prompt inicial do papel com o relatório atual: `executeInitialPrompt` com o relatório da rodada → igual ao inicial; revisão substituta → `reviewInitialPrompt`.
- [ ] V-03e: `folder` com `..`, absoluto ou com `\`, e `reportPath` fora da pasta → `TaskError("invalid_path")`.
- [ ] V-03f: o prompt inicial da revisão passado ao `codexTurnInput` → reconhecido como a skill `flow-dev:spec-conformance`.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Ao fim da tarefa: `pnpm --dir packages/api test` completo passando uma vez.
- Typecheck e lint do pacote sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. -->
- 2026-11-25 · **02.1 concluída.** Criados os tipos e as funções puras da máquina de estados; os testes cobrem ações, transições, rodada, falhas recuperáveis e estados finais. Alterei também `application/services/tasks/taskErrors.ts`, fora da lista da mini-tarefa, para incluir `review_action_invalid`, necessário ao contrato `TaskError` desta regra. `pnpm --dir packages/api exec vitest run src/application/services/review/reviewCycleRules.test.ts` → 6 testes passaram. `pnpm --dir packages/api typecheck` → passou.
- 2026-11-25 · **02.2 concluída.** Criado o leitor do documento com parsing de `etapa`/`relatorio`, validação da edição da sessão da vez depois do início, papel permitido e relatório novo na pasta. `pnpm --dir packages/api exec vitest run src/application/services/review/reviewStageReader.test.ts` → 11 testes passaram. `pnpm --dir packages/api typecheck` → passou.
- 2026-11-25 · **02.3 concluída.** Criados os prompts e mensagens de revisão, execução e ressalvas com cópias exatas; a frase parcial só é anexada às mensagens de revisão. Exportei `requireRelativePath` e `requireInside` de `taskPlanPrompts.ts` sem alterar seu comportamento e reutilizei a validação nos prompts e no leitor. `pnpm --dir packages/api exec vitest run src/application/services/review/reviewPrompts.test.ts src/application/services/terminal/taskPlanPrompts.test.ts` → 15 testes passaram. `pnpm --dir packages/api typecheck` → passou.
- 2026-11-25 · **Task 02 concluída.** `pnpm --dir packages/api test` → 136 arquivos e 847 testes passaram. `pnpm lint` → passou; o workspace não declara lint para `packages/api`, então o comando executou eslint em `apps/web`. `pnpm --dir packages/api typecheck` → passou após as mudanças finais.
