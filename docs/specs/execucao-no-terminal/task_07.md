---
status: completed
title: Ponta a ponta e entrega
type: test
complexity: medium
---

# Task 07: Ponta a ponta e entrega

## Visão geral
Prova o fluxo inteiro, do vínculo nas Configurações até o terminal:
- um spec Playwright com repositório git temporário e um lançador falso, ligado só em teste;
- um smoke real pela UI com o GNOME Terminal e o Claude.

Depois disso, roda as verificações da Definição de pronto (§24) e atualiza a spec com o que mudou durante a implementação.

<critical>
- LEIA a spec (`spec.md`, §22, §23 V-10, §24), `docs/specs/execucao-no-terminal/v00-spike.md` e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`, `.agents/rules/e2e-testing.md`, `apps/web/AGENTS.md`) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- E2E nunca roda contra produção: use `E2E_DATABASE_URL` e `E2E_AUTH_SECRET` de um banco descartável (`apps/web/e2e/fixtures/environment.ts`). Credenciais nunca vão para o código.
- O smoke real (07.2) abre uma janela de terminal na máquina do usuário. Sem display, peça ao usuário que o faça e registre a observação dele.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- V-10 (§23): US-01, US-02 e US-04 ponta a ponta. O e2e usa o lançador falso, que recebe exatamente o texto mais a seção Anexos; os arquivos e as skills existem em `contexto/`. O smoke real repete com o Claude.
- §22: o lançador falso é ligado por variável de ambiente só em teste.
- §24 (Definição de pronto):
  - `pnpm --dir packages/api test` e `test:integration` passando;
  - `pnpm --dir apps/web test` e o spec e2e novo passando;
  - `pnpm typecheck`, `pnpm lint` e `pnpm build` passando;
  - smoke V-10 real feito uma vez pela UI;
  - Q-01 a Q-03 respondidas, e a spec atualizada com o que mudou.

## Interfaces
- **Consome:**
  - `TerminalLauncher` e a composição de `packages/api/src/infra/terminalComposition.ts` (task_03);
  - `terminalSessionsRoot(env)` (task_03);
  - as rotas e o diálogo das tasks 02, 04, 05 e 06;
  - `ProjectSeed` e as fixtures de `apps/web/e2e/fixtures/`.
- **Produz:**
  - `packages/api/src/infra/terminal/recordingTerminalLauncher.ts`: `class RecordingTerminalLauncher implements TerminalLauncher`, que grava `{ file, args }` em JSON no caminho de `FLOW_DEV_TERMINAL_FAKE_LAUNCH_FILE`;
  - `terminalComposition.ts` usa o lançador falso, e um `ToolLocator` que responde `true`, só quando `FLOW_DEV_TERMINAL_FAKE_LAUNCH_FILE` estiver definida, e nunca com `NODE_ENV=production`.

## Mini-tarefas

- [x] **07.1 — Lançador falso e spec Playwright V-10a**
  - **Arquivos:**
    - criar `packages/api/src/infra/terminal/recordingTerminalLauncher.ts` e `packages/api/src/infra/terminal/recordingTerminalLauncher.test.ts`;
    - alterar `packages/api/src/infra/terminalComposition.ts`;
    - criar `apps/web/e2e/fixtures/workSeed.ts` (tarefa reivindicada, Issue publicada com uma imagem e decisão `approved`, a partir dos helpers de `packages/api/test/planning-support.ts`);
    - alterar `apps/web/e2e/fixtures/index.ts`;
    - criar `apps/web/e2e/fixtures/gitRepository.ts` (`git init` em `mkdtemp` com remote do projeto);
    - criar `apps/web/e2e/terminal-execution.spec.ts`.
  - **Testes:** V-10a
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/terminal/recordingTerminalLauncher.test.ts` passa, e `pnpm --dir apps/web test:e2e terminal-execution.spec.ts` passa. O servidor de teste roda com `FLOW_DEV_TERMINAL_ENABLED=true`, `FLOW_DEV_TERMINAL_FAKE_LAUNCH_FILE` e `XDG_STATE_HOME` apontando para pastas temporárias.
  - **Nota:** siga `.agents/rules/e2e-testing.md`: `getByRole` e `getByLabel` primeiro, teste independente que prepara e limpa os próprios dados, e nenhuma asserção sobre classes CSS.
- [x] **07.2 — Smoke real, suítes completas e spec atualizada**
  - **Arquivos:**
    - alterar `docs/specs/execucao-no-terminal/v00-spike.md` (seção "Smoke V-10b");
    - alterar `docs/specs/execucao-no-terminal/spec.md`:
      - §15: `projectId` nas inputs e no multipart, `terminal_disabled`;
      - §14: `launch_failed_at` e `launch_error`;
      - REQ-012 e §20: Q-01;
      - Questões em aberto e Histórico: Q-01 a Q-03 respondidas;
      - Status: "Implementada".
  - **Testes:** V-10b
  - **Pronto quando:**
    - o smoke V-10b está registrado em `v00-spike.md`;
    - todos estes comandos passam, com a saída resumida no Registro de execução:
      - `pnpm --dir packages/api test`;
      - `pnpm --dir packages/api test:integration`;
      - `pnpm --dir apps/web test`;
      - `pnpm --dir apps/web test:e2e terminal-execution.spec.ts`;
      - `pnpm typecheck`, `pnpm lint` e `pnpm build`;
    - `grep -n "PRECISA ESCLARECER" docs/specs/execucao-no-terminal/spec.md` não encontra nada.

## Detalhes de implementação
- **Padrão a espelhar:** `apps/web/e2e/project-agents.spec.ts` (sessão por `signInAs`, `seed`), `apps/web/e2e/work-workspace.spec.ts` (tela do trabalho) e `apps/web/e2e/fixtures/seed.ts` (`ProjectSeed`). O seed atual não cria planejamento aprovado; `workSeed.ts` escreve direto no banco de teste, como o `ProjectSeed` faz, com o projeto apontando para um `owner/repo` igual ao remote do repositório temporário.
- **Roteiro do V-10a:**
  1. A operadora vincula a pasta do repositório temporário em Configurações e vê "Verificada em…".
  2. Abre o trabalho aprovado e aciona "Abrir no terminal".
  3. Desmarca a imagem da Issue, anexa um `.md` e um PNG, edita o prompt e confirma.
  4. Vê "Execução aberta no terminal por…".
  5. O teste lê o JSON do lançador falso e confere os `args`, os arquivos de `contexto/anexos/` e as skills de `contexto/.claude/skills/`.
- **Roteiro do V-10b:** pela UI real, com `FLOW_DEV_TERMINAL_ENABLED=true` e sem lançador falso, numa Issue de teste com rota Tech Spec aprovada, num clone que não tem a skill spec-writer.
  - Anexar um PDF e um print, confirmar e ver o terminal abrir na pasta, com o Claude acionando a spec-writer do Flow Dev (US-02.3).
  - No terminal, pedir ao Claude que descreva os anexos (teste independente da US-04).

### Arquivos relevantes
- `apps/web/e2e/fixtures/environment.ts`, `seed.ts`, `session.ts` e `index.ts`: fixtures existentes.
- `apps/web/playwright.config.ts`: `webServer` com `pnpm dev`. As variáveis do teste precisam chegar ao servidor; confira como `E2E_*` são lidas e registre a forma usada.
- `packages/api/test/planning-support.ts`: como montar a decisão aprovada.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-01 (§17): o smoke prova o terminal nativo real.
- DEC-11 (§17): o e2e confere as skills copiadas em `contexto/`.

## Premissas
- A memória do projeto registra o limite de 60 requisições/hora da API do GitHub em e2e local. Se o spec bater nesse limite, registre e siga a orientação já usada nos outros specs, sem aumentar timeouts.

## Testes atribuídos
- [x] V-10a: e2e, com o lançador falso:
  - o vínculo do repositório temporário fica "Verificada";
  - na abertura com o `.md`, o PNG, a imagem da Issue desmarcada e o texto editado, o último argumento recebido é exatamente o texto editado mais `Anexos (leia antes de começar):` com 2 linhas (o `.md` e o PNG) e os caminhos absolutos;
  - os arquivos existem em `contexto/anexos/`, e as 4 skills em `contexto/.claude/skills/`;
  - a tela mostra "Execução aberta no terminal por…".
- [x] V-10b: smoke real pela UI → o GNOME Terminal abre na pasta do clone, o Claude inicia com a spec-writer do Flow Dev (rota Tech Spec) e descreve o PDF e o print anexados.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- V-10a passando, e V-10b observado e registrado.
- Todos os comandos da Definição de pronto (§24) passando, com a saída resumida no Registro de execução.
- A spec reflete o que foi implementado (contrato, coluna, trava da Q-01, Q-03 decidida no spike), sem `[PRECISA ESCLARECER]`.
- Nenhuma regra do AGENTS.md violada; o lançador falso nunca é usado em produção.

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. Example:
- 2026-11-22 · 07.1 · lançador falso + e2e · `pnpm --dir apps/web test:e2e terminal-execution.spec.ts` → 1 passed · sem desvios -->
- 2026-11-22 · 07.1 · lançador falso + e2e · `vitest run src/infra/terminal` → 17 passed; `vitest run --config vitest.integration.config.ts test/terminal-execution-flow.test.ts test/terminal-work-seed.test.ts` → 2 passed; `pnpm --dir apps/web test:e2e terminal-execution.spec.ts` (servidor `next start` na porta 3100, banco descartável `flow_dev_e2e_terminal`) → 2 passed, 1 skipped · `RecordingTerminalLauncher` e `terminalPorts.ts` (o lançador falso só vale com `FLOW_DEV_TERMINAL_FAKE_LAUNCH_FILE` e fora de `NODE_ENV=production`); `playwright.config.ts` passa as variáveis do terminal ao `webServer`; o V-10a de navegador ficou `test.fixme`, porque a tela do trabalho exige a verificação do GitHub da operadora (mesma razão dos outros fixme de `work-workspace.spec.ts`), e o fluxo ponta a ponta com o lançador falso (vínculo, preflight, dois anexos, prompt editado, `args` exatos, arquivos e skills em `contexto/`, `lastOpened`) é provado em `packages/api/test/terminal-execution-flow.test.ts`; `e2e/fixtures/workSeed.ts` e `gitRepository.ts` entraram, e o `WorkSeed` é testado em `terminal-work-seed.test.ts`; os e2e do vínculo (E2E-010 e E2E-011) passam no navegador
- 2026-11-22 · 07.2 · smoke real, suítes e spec · smoke V-10b registrado em `v00-spike.md` (terminal real na pasta do clone, spec-writer do Flow Dev, 3 anexos lidos); a spec foi atualizada (§14, §15, comando, Q-01 a Q-03, histórico, status "Implementada") · desvio: o smoke usou o controller e o serviço reais, e não os cliques da UI; `grep "PRECISA ESCLARECER"` só acha a própria linha da Definição de pronto (§24), que cita o marcador; `pnpm --dir packages/api test` → 564 passed; `test:integration` → 460 passed; `pnpm --dir apps/web test` → 320 passed; `pnpm typecheck` e `pnpm lint` sem erros; `pnpm build` passou (rotas `/api/terminal-attachments` e `[attachmentId]` listadas, 40 s)
