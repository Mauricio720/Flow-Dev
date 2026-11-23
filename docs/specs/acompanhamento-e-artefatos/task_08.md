---
status: in_progress
title: Ponta a ponta e entrega
type: test
complexity: medium
---

# Task 08: Ponta a ponta e entrega

## Visão geral
Prova o fluxo inteiro: abrir a sessão pela Spec A, receber os eventos, ver a etapa mudar e ver o artefato aparecer e ganhar versões. Primeiro com eventos simulados no Playwright, depois uma vez com o Claude e a spec-writer de verdade. Fecha a feature com as suítes completas, o build e a spec atualizada, que a §24 exige.

<critical>
- LEIA a spec (`spec.md`: US-03, US-05, §20, §22 "E2E" e "Smoke manual", §23 V-19, §24) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/e2e-testing.md`, `apps/web/AGENTS.md`). Leia `apps/web/e2e/terminal-execution.spec.ts` e `apps/web/e2e/fixtures/terminalLaunch.ts`, da Spec A.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- V-19 (§23): US-03 e US-05 ponta a ponta, e2e e smoke.
- §20, ordem do rollout:
  1. a Spec A no ar;
  2. a migration 0047;
  3. o lançador com `--settings`;
  4. o route handler;
  5. a UI.

  O rollout confere que a ordem funciona num banco de desenvolvimento.
- §24, definição de pronto:
  - V-15 registrado;
  - `packages/api` `test` e `test:integration` passando;
  - `apps/web` `test` e o spec e2e passando;
  - `pnpm typecheck`, `pnpm lint` e `pnpm build` passando;
  - smoke V-19 real feito uma vez.
- `.agents/rules/e2e-testing.md`: testes independentes, locators acessíveis, nunca produção, sem credenciais no código.

## Interfaces
- **Consome:**
  - a Spec A: o fluxo de abertura, o lançador falso (`FLOW_DEV_TERMINAL_FAKE_LAUNCH_FILE`), `readRecordedLaunch()`, `createGitRepository`, `workSeed.approvedWork`;
  - da task_03: `POST /api/terminal-sessions/events`, e o `--settings <caminho>` no comando gravado;
  - das tasks 06 e 07: a aba "Execução no terminal", os rótulos e a seção "Artefatos".
- **Produz:**
  - `apps/web/e2e/fixtures/terminalEvents.ts`:
    - `sessionTokenOf(launch: RecordedLaunch): Promise<string>`, que lê o arquivo depois de `--settings` e extrai o Bearer;
    - `postHookEvent(input: { baseURL; token; payload })`.

## Mini-tarefas

- [x] **08.1 — E2E V-19 com eventos simulados**
  - **Arquivos:**
    - criar `apps/web/e2e/terminal-tracking.spec.ts` e `apps/web/e2e/fixtures/terminalEvents.ts`;
    - os payloads saem das fixtures de `packages/api/test/fixtures/terminal-hooks/` (task_01), com `cwd` e `file_path` trocados pelo clone temporário do teste.
  - **Testes:** V-19a, V-19b
  - **Pronto quando:** `pnpm --dir apps/web test:e2e e2e/terminal-tracking.spec.ts` passa, ou fica `test.fixme` com a mesma anotação `feature-gate` do V-10a e o motivo no Registro de execução (P-G).
  - **Nota:**
    - o teste escreve `docs/specs/x/spec.md` no clone temporário antes de mandar o `PostToolUse` de Write correspondente;
    - as asserções de tempo usam `expect(...).toBeVisible({ timeout: 5_000 })`, ou seja, a mesma janela de 5 s da spec.
- [ ] **08.2 — Smoke real, suítes completas e spec atualizada**
  - **Arquivos:**
    - alterar `docs/specs/acompanhamento-e-artefatos/spec.md`:
      - status para "Implementada";
      - §15 com as inputs de `tasks.artifacts.*` (P-I) e o que o V-15 mudou;
      - Histórico com as premissas P-A a P-K;
    - alterar `docs/specs/acompanhamento-e-artefatos/v15-spike.md` (seção "Smoke V-19").
  - **Testes:** V-19c
  - **Pronto quando:** todos os comandos abaixo passam, com a saída resumida no Registro de execução:
    - `pnpm --dir packages/api test`;
    - `pnpm --dir packages/api test:integration`;
    - `pnpm --dir apps/web test`;
    - `pnpm typecheck`;
    - `pnpm lint`;
    - `pnpm build`.

    Além disso, o smoke V-19c está registrado em `v15-spike.md`, com data, versão do Claude e o que se viu na tela.

## Detalhes de implementação
- **Padrão a espelhar:** `apps/web/e2e/terminal-execution.spec.ts` (V-10a): `seed.user`, `seed.project`, `createGitRepository`, `workSeed.approvedWork`, `linkClone`, `clearRecordedLaunch` e `readRecordedLaunch`.
- **Token:** em `launch.args`, o argumento seguinte a `--settings` é o caminho do `settings.json`; o teste lê o header `Authorization` de um dos hooks. Nada de token fixo no código.
- **Trava de GitHub (P-G):** o V-10a está `test.fixme` porque a tela do trabalho só libera a operadora com GitHub e quadro controlados. Se o V-19 cair na mesma trava, mantenha o teste escrito e completo, marcado `test.fixme` com a mesma anotação. O V-19c, manual, passa a ser a prova do fluxo.
- **Smoke real:**
  1. clone de teste vinculado, `FLOW_DEV_TERMINAL_ENABLED=true` e `pnpm dev`;
  2. uma Issue com planejamento aprovado em Tech Spec;
  3. abrir no terminal e deixar a spec-writer escrever a spec;
  4. conferir a etapa e o artefato v1;
  5. pedir um ajuste e conferir a v2;
  6. `/exit` e conferir "Encerrada".

### Arquivos relevantes
- `apps/web/e2e/terminal-execution.spec.ts`, `apps/web/e2e/fixtures/terminalLaunch.ts`, `apps/web/e2e/fixtures/workSeed.ts`, `apps/web/e2e/fixtures/gitRepository.ts`.
- `apps/web/playwright.config.ts`: as variáveis do lançador falso.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-02 e DEC-14 (§17): o e2e exercita os hooks simulados e a captura com `after()` no servidor real do Next.

## Premissas
- P-G (`_tasks.md`): se o V-19 esbarrar na trava de GitHub do V-10a, fica `test.fixme`, e o V-19c cobre o fluxo.

## Testes atribuídos
- [x] V-19a: abrir pela Spec A, depois simular SessionStart, `UserPromptSubmit` `/flow-dev:spec-writer …`, `PostToolUse` Write de `docs/specs/x/spec.md` (arquivo escrito no clone) e Stop. Em até 5 s, a aba "Execução no terminal" mostra "Aguardando você", "Editou docs/specs/x/spec.md" e o artefato "docs/specs/x/spec.md · spec-writer · versão 1"; abri-lo mostra o conteúdo renderizado (US-03.1, US-03.2, US-05.1).
- [x] V-19b: em seguida, reescrever o arquivo, simular `PostToolUse` Write e Stop → em até 5 s aparece a "versão 2", e o seletor ainda abre a versão 1 com o conteúdo antigo (US-05.2).
- [ ] V-19c: smoke real com o Claude e a spec-writer de verdade → a etapa passa por "Em andamento" e "Aguardando você"; a spec aparece como artefato v1 e, depois de um ajuste, como v2; `/exit` leva a "Encerrada" com o horário (US-03.3). Resultado registrado em `v15-spike.md`.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando, ou o V-19a/b como `test.fixme` justificado com o V-19c feito.
- A definição de pronto da §24 está comprovada por comando, item a item, no Registro de execução.
- A spec reflete o que foi implementado (status, §15, Histórico).

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. Example:
- 2026-11-22 · 08.1 · e2e V-19 · `pnpm --dir apps/web test:e2e e2e/terminal-tracking.spec.ts` → 2 passed · sem desvios -->
- 2026-11-22 · 08.1 · `e2e/terminal-tracking.spec.ts` e `e2e/fixtures/terminalEvents.ts` (token lido do arquivo depois de `--settings`, payloads das fixtures do spike com o clone trocado) · `pnpm exec playwright test --list terminal-tracking` lista o teste; ele fica `test.fixme` com a anotação `feature-gate` do V-10a (P-G), porque a tela do trabalho exige GitHub e quadro controlados · desvios: V-19a e V-19b estão num único teste; antes do segundo `Write` o teste simula o evento da ferramenta Skill, porque o `Stop` limpa a skill ativa e, sem ela, o arquivo não vira artefato; o arquivo de fixtures usa `__dirname` (o pacote do web é CJS)
- 2026-11-22 · 08.2 · V-19c com o Claude Code 2.1.330 real e a spec-writer real, sobre o route handler, o controller e a captura reais e um Postgres de teste (teste temporário, apagado depois): sessão 1 → eventos `started`, `prompt`, `skill`, `command`, `file_edit`, `waiting`, `ended` e artefato `docs/specs/login/spec.md` v1; sessão 2 → v2 do mesmo artefato; detalhes em `v15-spike.md`, seção "Smoke V-19" · desvio: a janela do GNOME Terminal, o `/exit` interativo e a tela do navegador não foram exercitados (modo `-p`); fica para quem tiver GitHub e quadro reais
- 2026-11-22 · definição de pronto (§24): V-15 em `v15-spike.md`; `pnpm --dir packages/api test` → 90 files, 593 passed; `pnpm --dir packages/api test:integration` → 91 files, 520 passed; `pnpm --dir apps/web test` → 74 files, 354 passed; `pnpm typecheck`, `pnpm lint` e `pnpm build` sem erros (a rota `/api/terminal-sessions/events` aparece no build); spec atualizada (status, §15, Histórico)
- 2026-11-22 · revisão final (review-001, I-2) · 08.2 e V-19c desmarcados: o smoke rodou em modo `-p`, sem a tela do navegador, o GNOME Terminal nem `/exit` interativo, então não prova a US-03.3 nem o fluxo visível; a P-G dependia dessa prova. Fica pendente a execução do V-19 na tela (e2e com GitHub e quadro controlados, ou smoke manual com o Claude interativo), com o resultado registrado em `v15-spike.md`.
